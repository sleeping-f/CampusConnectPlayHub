const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult, param } = require('express-validator');
const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      console.error('JWT verify error:', err.name, err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    const id = payload.id ?? payload.friendId ?? payload.sub;
    if (!id) return res.status(400).json({ message: 'Token payload missing user id' });

    req.user = { id, email: payload.email, role: payload.role };
    next();
  });
};

// Ensure group exists
async function ensureGroup(req, res, group_id) {
  const [rows] = await req.db.execute(
    `SELECT group_id, creator_id FROM study_groups WHERE group_id = ?`,
    [group_id]
  );
  if (!rows.length) {
    res.status(404).json({ message: 'Study group not found' });
    return null;
  }
  return rows[0];
}

// --- POST /api/memberships/join ---
router.post(
  '/join',
  authenticateToken,
  body('group_id').isInt({ min: 1 }).withMessage('group_id required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const group_id = Number(req.body.group_id);
      const me = req.user.id;

      const group = await ensureGroup(req, res, group_id);
      if (!group) return;

      const [roleRows] = await req.db.execute(`SELECT role FROM users WHERE id = ?`, [me]);
      if (!roleRows.length) return res.status(404).json({ message: 'User not found' });
      if (roleRows[0].role !== 'student') return res.status(403).json({ message: 'Only students can join study groups' });

      const [exists] = await req.db.execute(
        `SELECT 1 FROM memberships WHERE sgroup_id = ? AND member_id = ? LIMIT 1`,
        [group_id, me]
      );
      if (exists.length) return res.status(200).json({ message: 'Already a member' });

      await req.db.execute(
        `INSERT INTO memberships (sgroup_id, member_id, date_joined)
         VALUES (?, ?, NOW())`,
        [group_id, me]
      );

      res.status(201).json({ message: 'Joined group successfully' });
    } catch (e) {
      console.error('POST /api/memberships/join error:', e);
      res.status(500).json({ message: 'Failed to join study group' });
    }
  }
);

// --- DELETE /api/memberships/leave ---
router.delete(
  '/leave',
  authenticateToken,
  body('group_id').isInt({ min: 1 }).withMessage('group_id required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const group_id = Number(req.body.group_id);
      const me = req.user.id;

      await req.db.execute(
        `DELETE FROM memberships WHERE sgroup_id = ? AND member_id = ?`,
        [group_id, me]
      );

      res.json({ message: 'Left group' });
    } catch (e) {
      console.error('DELETE /api/memberships/leave error:', e);
      res.status(500).json({ message: 'Failed to leave study group' });
    }
  }
);

// --- GET /api/memberships/:groupId/members ---
router.get(
  '/:groupId(\\d+)/members',
  authenticateToken,
  async (req, res) => {
    try {
      const group_id = Number(req.params.groupId);

      const [members] = await req.db.execute(
        `SELECT u.id AS member_id, u.firstName, u.lastName, u.email, u.campus_id, m.date_joined
         FROM memberships m, users u
         WHERE m.sgroup_id = ? AND u.id = m.member_id
         ORDER BY m.date_joined ASC, u.id ASC`,
        [group_id]
      );

      res.json({ members });
    } catch (e) {
      console.error('GET /api/memberships/:groupId/members error:', e);
      res.status(500).json({ message: 'Failed to load group members' });
    }
  }
);

// --- GET /api/memberships/mine ---
router.get(
  '/mine',
  authenticateToken,
  async (req, res) => {
    try {
      const me = req.user.id;
      const [rows] = await req.db.execute(
        `SELECT sg.group_id, sg.creator_id, sg.group_name, sg.description, sg.date_created,
                u.firstName, u.lastName, u.email, u.campus_id,
                m.date_joined
         FROM memberships m, study_groups sg, users u
         WHERE m.member_id = ?
           AND sg.group_id = m.sgroup_id
           AND u.id = sg.creator_id
         ORDER BY m.date_joined DESC, sg.group_id DESC`,
        [me]
      );
      res.json({ groups: rows });
    } catch (e) {
      console.error('GET /api/memberships/mine error:', e);
      res.status(500).json({ message: 'Failed to load your group memberships' });
    }
  }
);

// --- DELETE /api/memberships/:groupId/members/:studentId ---
router.delete(
  '/:groupId(\\d+)/members/:studentId(\\d+)',
  authenticateToken,
  async (req, res) => {
    try {
      const group_id = Number(req.params.groupId);
      const targetStudentId = Number(req.params.studentId);
      const me = req.user.id;

      const [g] = await req.db.execute(`SELECT creator_id FROM study_groups WHERE group_id = ?`, [group_id]);
      if (!g.length) return res.status(404).json({ message: 'Study group not found' });

      if (me !== targetStudentId && me !== g[0].creator_id) {
        return res.status(403).json({ message: 'Not allowed to remove this member' });
      }

      await req.db.execute(
        `DELETE FROM memberships WHERE sgroup_id = ? AND member_id = ?`,
        [group_id, targetStudentId]
      );

      res.json({ message: 'Member removed' });
    } catch (e) {
      console.error('DELETE /api/memberships/:groupId/members/:studentId error:', e);
      res.status(500).json({ message: 'Failed to remove member' });
    }
  }
);

module.exports = router;
