const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();


/* ───────────────────────── JWT auth (fixes Unauthorized) ───────────────────────── */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']).trim();
    } else if (req.cookies && req.cookies.token) {
      token = String(req.cookies.token).trim();
    }

    if (!token) return res.status(401).json({ message: 'Access token required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ message: 'Unauthorized' });

    req.user = { id: Number(payload.id), ...payload };
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

/* ───────────────────────── helpers ───────────────────────── */
const requireDb = (req, res, next) => {
  if (!req.db) return res.status(500).json({ message: 'DB connection missing' });
  next();
};

// both must exist in users & students (students only; no LEFT JOIN)
async function assertBothStudents(db, a, b) {
  const [[aRow]] = await db.execute(
    `SELECT u.id FROM users u, students s WHERE u.id = s.user_id AND u.id = ?`,
    [a]
  );
  if (!aRow) {
    const err = new Error('Your account is not a student');
    err.statusCode = 400;
    throw err;
  }

  const [[bRow]] = await db.execute(
    `SELECT u.id FROM users u, students s WHERE u.id = s.user_id AND u.id = ?`,
    [b]
  );
  if (!bRow) {
    const err = new Error('Target user is not a student');
    err.statusCode = 400;
    throw err;
  }
}

const shapeUser = (r) => ({
  id: r.id,
  firstName: r.firstName,
  lastName: r.lastName,
  email: r.email,
  campus_id: r.campus_id,
  department: r.department ?? null,
  profileImage: r.profileImage ?? null, // Include profile image
});

/* ===================================================================== */
/* 1) --- POST send request ---
   student_id_1 (me) sends a request to student_id_2
   Creates or re-sends with status='pending'
*/
router.post('/request', requireDb, authenticateToken, async (req, res) => {
  try {
    const student_id_1 = Number(req.user.id);
    const student_id_2 = Number(req.body?.student_id_2);

    if (!Number.isInteger(student_id_2) || student_id_2 <= 0) {
      return res.status(400).json({ message: 'student_id_2 is required (positive integer)' });
    }
    if (student_id_1 === student_id_2) {
      return res.status(400).json({ message: 'You cannot friend yourself' });
    }

    await assertBothStudents(req.db, student_id_1, student_id_2);

    // If opposite pending exists (they already sent me), surface that state
    const [[opp]] = await req.db.execute(
      `SELECT status FROM friends WHERE student_id_1 = ? AND student_id_2 = ?`,
      [student_id_2, student_id_1]
    );
    if (opp && opp.status === 'pending') {
      return res.status(200).json({ message: 'Incoming request already pending' });
    }

    // Upsert this directional edge to pending
    // Assumes a unique key on (student_id_1, student_id_2)
    await req.db.execute(
      `INSERT INTO friends (student_id_1, student_id_2, status, date_added)
       VALUES (?, ?, 'pending', NULL)
       ON DUPLICATE KEY UPDATE status='pending', date_added=NULL`,
      [student_id_1, student_id_2]
    );

    /* === ADD: notification → recipient gets "friend_request_received" === */
    await req.db.execute(
      `INSERT IGNORE INTO notifications
         (recipient_id, actor_id, type, title, message)
       VALUES (?, ?, 'friend_request_received', 'New Friend Request', 'You received a new friend request.')`,
      [student_id_2, student_id_1]
    );

    return res.status(201).json({
      message: 'Friend request sent',
      student_id_1,
      student_id_2,
      status: 'pending',
    });
  } catch (err) {
    console.error('POST /friends/request:', err);
    return res.status(err.statusCode || 500).json({ message: err.message || 'Internal server error' });
  }
});

/* ===================================================================== */
/* 2) --- PUT respond to request ---
   Accept/decline pending.
   - Recipient (student_id_2) can ACCEPT or DECLINE an incoming pending request:
       body: { student_id_1, action: 'accept' | 'decline' }
   - Sender (student_id_1) can DECLINE (retract) their own pending request:
       body: { student_id_2, action: 'decline' }
*/
router.put('/respond', requireDb, authenticateToken, async (req, res) => {
  try {
    const me = Number(req.user.id);
    const action = String(req.body?.action || '').toLowerCase();

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: "action must be 'accept' or 'decline'" });
    }

    const incoming_sender_id = Number(req.body?.student_id_1); // sender for incoming
    const outgoing_recipient_id = Number(req.body?.student_id_2);                       // recipient for outgoing

    if (incoming_sender_id && outgoing_recipient_id) {
      return res.status(400).json({ message: 'Provide either student_id_1 (incoming) OR student_id_2 (outgoing), not both' });
    }
    if (!incoming_sender_id && !outgoing_recipient_id) {
      return res.status(400).json({ message: 'Missing student_id_1 (incoming) or student_id_2 (outgoing)' });
    }

    // validate users exist & are students
    await assertBothStudents(req.db, me, incoming_sender_id || outgoing_recipient_id);

    if (incoming_sender_id) {
      // I am the recipient; they sent me → (student_id_1 = incoming_sender_id, student_id_2 = me)
      const [[row]] = await req.db.execute(
        `SELECT status FROM friends WHERE student_id_1 = ? AND student_id_2 = ?`,
        [incoming_sender_id, me]
      );
      if (!row || row.status !== 'pending') {
        return res.status(404).json({ message: 'No pending request from this user' });
      }

      if (action === 'accept') {
        await req.db.execute(
          `UPDATE friends SET status = 'accepted', date_added = NOW()
           WHERE student_id_1 = ? AND student_id_2 = ? AND status = 'pending'`,
          [incoming_sender_id, me]
        );

        /* === ADD: notification → original sender gets "friend_request_accepted" === */
        await req.db.execute(
          `INSERT IGNORE INTO notifications
             (recipient_id, actor_id, type, title, message)
           VALUES (?, ?, 'friend_request_accepted', 'Friend Request Accepted', 'Your friend request was accepted.')`,
          [incoming_sender_id, me]
        );

        return res.json({
          message: 'Friend request accepted',
          student_id_1: incoming_sender_id,
          student_id_2: me,
          status: 'accepted',
        });
      }

      // decline as recipient → delete pending
      await req.db.execute(
        `DELETE FROM friends WHERE student_id_1 = ? AND student_id_2 = ? AND status = 'pending'`,
        [incoming_sender_id, me]
      );
      return res.json({
        message: 'Friend request declined',
        student_id_1: incoming_sender_id,
        student_id_2: me,
        status: 'declined',
      });
    }

    // Outgoing retract: I am the sender; row must be (student_id_1 = me, student_id_2 = outgoing_recipient_id)
    if (action !== 'decline') {
      return res.status(403).json({ message: 'Senders can only decline (retract) their own pending requests' });
    }

    const [[outRow]] = await req.db.execute(
      `SELECT status FROM friends WHERE student_id_1 = ? AND student_id_2 = ?`,
      [me, outgoing_recipient_id]
    );
    if (!outRow || outRow.status !== 'pending') {
      return res.status(404).json({ message: 'No pending request to retract' });
    }

    await req.db.execute(
      `DELETE FROM friends WHERE student_id_1 = ? AND student_id_2 = ? AND status = 'pending'`,
      [me, outgoing_recipient_id]
    );
    return res.json({
      message: 'Pending request retracted',
      student_id_1: me,
      student_id_2: outgoing_recipient_id,
      status: 'declined',
    });
  } catch (err) {
    console.error('PUT /friends/respond:', err);
    return res.status(err.statusCode || 500).json({ message: err.message || 'Internal server error' });
  }
});

/* ===================================================================== */
/* 3) --- GET accepted friends (for FriendFinder list) ---
   Response: { friends: [ { friend: <user>, since: <date|null> } ] }
*/
router.get('/', requireDb, authenticateToken, async (req, res) => {
  try {
    const me = Number(req.user.id);
    const [rows] = await req.db.execute(
      `
      SELECT u.id, u.firstName, u.lastName, u.email, u.campus_id, s.department, u.profileImage, f.date_added
      FROM users u, students s, friends f
      WHERE u.id = s.user_id
        AND (
              (f.student_id_1 = ? AND f.student_id_2 = u.id) OR
              (f.student_id_2 = ? AND f.student_id_1 = u.id)
            )
        AND f.status = 'accepted'
      ORDER BY u.firstName, u.lastName
      `,
      [me, me]
    );
    const friends = rows.map(r => ({ friend: shapeUser(r), since: r.date_added || null }));
    return res.json({ friends });
  } catch (err) {
    console.error('GET /friends:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* ===================================================================== */
/* 3b) --- SEARCH accepted friends ---
   GET /api/friends/search?q=...
   Returns only accepted friends matching q
*/
router.get('/search', requireDb, authenticateToken, async (req, res) => {
  try {
    const me = Number(req.user.id);
    const q = `%${String(req.query?.q || '').trim()}%`;
    if (q === '%%') return res.json({ count: 0, results: [] });

    const [rows] = await req.db.execute(
      `
      SELECT u.id, u.firstName, u.lastName, u.email, u.campus_id, s.department, u.profileImage
      FROM users u, students s, friends f
      WHERE u.id = s.user_id
        AND f.status = 'accepted'
        AND (
              (f.student_id_1 = ? AND u.id = f.student_id_2)
           OR (f.student_id_2 = ? AND u.id = f.student_id_1)
        )
        AND (
          u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ? OR u.campus_id LIKE ?
        )
      ORDER BY u.firstName, u.lastName
      `,
      [me, me, q, q, q, q]
    );

    return res.json({ count: rows.length, results: rows.map(shapeUser) });
  } catch (err) {
    console.error('GET /friends/search:', err);
    return res.status(500).json({ message: 'Search failed' });
  }
});

/* ===================================================================== */
/* 4) --- GET pending requests ---
   Returns incoming (I can act) and outgoing (I sent) separately.
   Resp: { incoming: [users], outgoing: [users] }
*/
router.get('/pending', requireDb, authenticateToken, async (req, res) => {
  try {
    const me = Number(req.user.id);

    // incoming → they sent me: (student_id_1 = them, student_id_2 = me)
    const [inRows] = await req.db.execute(
      `
      SELECT u.id, u.firstName, u.lastName, u.email, u.campus_id, s.department, u.profileImage
      FROM users u, students s, friends f
      WHERE u.id = s.user_id
        AND f.status = 'pending'
        AND f.student_id_2 = ?
        AND u.id = f.student_id_1
      ORDER BY u.firstName, u.lastName
      `,
      [me]
    );

    // outgoing → I sent them: (student_id_1 = me, student_id_2 = them)
    const [outRows] = await req.db.execute(
      `
      SELECT u.id, u.firstName, u.lastName, u.email, u.campus_id, s.department, u.profileImage
      FROM users u, students s, friends f
      WHERE u.id = s.user_id
        AND f.status = 'pending'
        AND f.student_id_1 = ?
        AND u.id = f.student_id_2
      ORDER BY u.firstName, u.lastName
      `,
      [me]
    );

    return res.json({
      incoming: inRows.map(shapeUser),
      outgoing: outRows.map(shapeUser),
    });
  } catch (err) {
    console.error('GET /friends/pending:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* ===================================================================== */
/* 5) --- DELETE friend ---
   Either side can delete an accepted friendship OR a pending edge.
   Route keeps old param (:friendId) for compatibility.
*/
router.delete('/:friendId(\\d+)', requireDb, authenticateToken, async (req, res) => {
  try {
    const me = Number(req.user.id);
    const other_id = Number(req.params.friendId);
    if (!Number.isInteger(other_id) || other_id <= 0) {
      return res.status(400).json({ message: 'friend ID must be a positive integer' });
    }
    if (other_id === me) {
      return res.status(400).json({ message: 'Invalid friend ID' });
    }

    const [result] = await req.db.execute(
      `DELETE FROM friends
       WHERE (student_id_1 = ? AND student_id_2 = ?)
          OR (student_id_1 = ? AND student_id_2 = ?)`,
      [me, other_id, other_id, me]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No friendship or pending request found' });
    }
    return res.json({ message: 'Removed', student_id_me: me, student_id_other: other_id });
  } catch (err) {
    console.error('DELETE /friends/:friendId:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
