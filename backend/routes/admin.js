// backend/routes/admin.js
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user; // may not include role; we will check DB
    next();
  });
};

const ensureAdmin = async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Invalid token (no id)' });
    const [[row]] = await req.db.execute(`SELECT role FROM users WHERE id = ?`, [req.user.id]);
    if (!row) return res.status(404).json({ message: 'User not found' });
    if (row.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch (e) {
    console.error('ensureAdmin error:', e);
    res.status(500).json({ message: 'Role check failed' });
  }
};

const parsePager = (req) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);
  return { limit, offset };
};

// Debug: verify reachability/role from frontend
router.get('/ping', authenticateToken, ensureAdmin, (req, res) => {
  res.json({ ok: true });
});

// Feedback list
router.get('/feedback', authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { limit, offset } = parsePager(req);
    const { status, q } = req.query;

    const where = [];
    const params = [];
    if (status) { where.push('f.status = ?'); params.push(status); }
    if (q) {
      where.push('(f.message LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT f.id, f.user_id, f.message, f.priority, f.status, f.created_at,
             u.firstName, u.lastName, u.email
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ${whereSql}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?`;
    const countSql = `
      SELECT COUNT(*) AS total
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ${whereSql}`;

    const [rows] = await req.db.execute(sql, [...params, limit, offset]);
    const [cnt]  = await req.db.execute(countSql, params);
    res.json({ items: rows, total: cnt[0].total, limit, offset });
  } catch (err) {
    console.error('GET /admin/feedback error:', err);
    res.status(500).json({ message: 'Failed to load feedback' });
  }
});

// Bugs list
router.get('/bugs', authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { limit, offset } = parsePager(req);
    const { status, q } = req.query;

    const where = [];
    const params = [];
    if (status) { where.push('b.status = ?'); params.push(status); }
    if (q) {
      where.push('(b.title LIKE ? OR b.description LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT b.id, b.user_id, b.title, b.description, b.severity, b.status, b.created_at,
             u.firstName, u.lastName, u.email
      FROM bug_reports b
      LEFT JOIN users u ON u.id = b.user_id
      ${whereSql}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?`;
    const countSql = `
      SELECT COUNT(*) AS total
      FROM bug_reports b
      LEFT JOIN users u ON u.id = b.user_id
      ${whereSql}`;

    const [rows] = await req.db.execute(sql, [...params, limit, offset]);
    const [cnt]  = await req.db.execute(countSql, params);
    res.json({ items: rows, total: cnt[0].total, limit, offset });
  } catch (err) {
    console.error('GET /admin/bugs error:', err);
    res.status(500).json({ message: 'Failed to load bug reports' });
  }
});

// Update statuses
router.put('/feedback/:id/status', authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'status required' });
    const [r] = await req.db.execute('UPDATE feedback SET status = ? WHERE id = ?', [status, id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Feedback not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /admin/feedback/:id/status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

router.put('/bugs/:id/status', authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'status required' });
    const [r] = await req.db.execute('UPDATE bug_reports SET status = ? WHERE id = ?', [status, id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Bug report not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /admin/bugs/:id/status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

module.exports = router;
