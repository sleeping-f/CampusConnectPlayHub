const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

function extractUserIdFromPayload(p) {
  return Number(
    p?.id ??
    p?.user_id ??
    p?.userId ??
    p?.uid ??
    p?.sub ??
    p?.user?.id ??
    p?.user?.user_id
  );
}

function ensureAuthLocal(req, res, next) {
  try {
    const fromUpstream =
      req.user && extractUserIdFromPayload(req.user);
    if (fromUpstream) {
      req.authUserId = fromUpstream;
      return next();
    }

    const hdr = req.headers.authorization || '';
    if (!hdr.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing Authorization header' });
    }
    const token = hdr.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const uid = extractUserIdFromPayload(payload);
    if (!uid) {
      return res.status(401).json({ message: 'Missing user id in token' });
    }
    req.authUserId = uid;
    next();
  } catch (err) {
    console.error('Auth error:', err?.message || err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function needDb(req, res) {
  if (!req.db?.execute) {
    res.status(500).json({ message: 'Database connection not available on req.db' });
    return true;
  }
  return false;
}

/*
 * GET /api/notifications?page=1&limit=10&unreadOnly=false
 */
router.get('/', ensureAuthLocal, async (req, res) => {
  try {
    if (needDb(req, res)) return;
    const userId = req.authUserId;

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
    const unreadOnly = String(req.query.unreadOnly ?? 'false') === 'true';
    const offset = (page - 1) * limit;

    const where = ['n.recipient_id = ?'];
    const params = [userId];
    if (unreadOnly) where.push('n.is_read = 0');
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [countRows] = await req.db.execute(
      `SELECT COUNT(*) AS c FROM notifications n ${whereSql}`,
      params
    );
    const total = Number(countRows?.[0]?.c || 0);

    const safeLimit = Number.isFinite(limit) ? limit : 10;
    const safeOffset = Number.isFinite(offset) ? offset : 0;

    const [rows] = await req.db.query(
      `SELECT
         n.notification_id,
         n.recipient_id,
         n.actor_id,
         n.type,
         n.title,
         n.message,
         n.is_read,
         n.read_at,
         n.created_at,
         u.firstName AS actor_firstName,
         u.lastName  AS actor_lastName
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       ${whereSql}
       ORDER BY n.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    res.json({ items: rows, page, limit: safeLimit, total });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

/*
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read
 */
router.patch('/:id/read', ensureAuthLocal, async (req, res) => {
  try {
    if (needDb(req, res)) return;
    const userId = req.authUserId;
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const [result] = await req.db.execute(
      `UPDATE notifications
         SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE notification_id = ? AND recipient_id = ?
       LIMIT 1`,
      [id, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/notifications/:id/read error:', err);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

/*
 * PATCH /api/notifications/read-all
 * Marks all notifications as read.
 */
router.patch('/read-all', ensureAuthLocal, async (req, res) => {
  try {
    if (needDb(req, res)) return;
    const userId = req.authUserId;

    await req.db.execute(
      `UPDATE notifications
         SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE recipient_id = ? AND is_read = 0`,
      [userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/notifications/read-all error:', err);
    res.status(500).json({ message: 'Failed to mark all read' });
  }
});

/*
 * PATCH /api/notifications/:id/unread
 * Sets is_read = 0 and read_at = NULL for one notification
 */
router.patch('/:id/unread', ensureAuthLocal, async (req, res) => {
  try {
    if (needDb(req, res)) return;
    const userId = req.authUserId;
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const [result] = await req.db.execute(
      `UPDATE notifications
         SET is_read = 0, read_at = NULL
       WHERE notification_id = ? AND recipient_id = ?
       LIMIT 1`,
      [id, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/notifications/:id/unread error:', err);
    res.status(500).json({ message: 'Failed to mark as unread' });
  }
});

/*
 * PATCH /api/notifications/unread-all
 * Makes all the notifications unread again.
 */
router.patch('/unread-all', ensureAuthLocal, async (req, res) => {
  try {
    if (needDb(req, res)) return;
    const userId = req.authUserId;

    await req.db.execute(
      `UPDATE notifications
         SET is_read = 0, read_at = NULL
       WHERE recipient_id = ? AND is_read = 1`,
      [userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/notifications/unread-all error:', err);
    res.status(500).json({ message: 'Failed to mark all unread' });
  }
});

module.exports = router;
