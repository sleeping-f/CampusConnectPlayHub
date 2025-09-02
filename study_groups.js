const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Reuse the same auth middleware pattern as your other routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Only students can create/join (you keep roles: student, manager, admin)
const ensureStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can access study groups' });
  }
  next();
};

// Create group
router.post('/',
  authenticateToken,
  ensureStudent,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name 2-100 chars'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { name, description } = req.body;
    try {
      const [result] = await req.db.execute(
        `INSERT INTO study_groups (name, description, creatorId) VALUES (?, ?, ?)`,
        [name, description || null, req.user.userId]
      );

      // auto-add creator as owner
      await req.db.execute(
        `INSERT INTO study_group_members (groupId, userId, role) VALUES (?, ?, 'owner')`,
        [result.insertId, req.user.userId]
      );

      const [rows] = await req.db.execute(
        `SELECT g.*, 'owner' AS myRole FROM study_groups g WHERE g.id = ?`,
        [result.insertId]
      );
      res.json({ success: true, group: rows[0] });
    } catch (e) {
      console.error('Create group error:', e);
      res.status(500).json({ message: 'Failed to create group' });
    }
  }
);

// List all groups (basic browse/search)
router.get('/', authenticateToken, async (req, res) => {
  const q = (req.query.q || '').trim();
  try {
    let sql = `SELECT g.*, 
        EXISTS(SELECT 1 FROM study_group_members m WHERE m.groupId=g.id AND m.userId=?) AS isMember
      FROM study_groups g`;
    const args = [req.user.userId];
    if (q) {
      sql += ` WHERE g.name LIKE ? OR g.description LIKE ?`;
      args.push(`%${q}%`, `%${q}%`);
    }
    sql += ` ORDER BY g.createdAt DESC LIMIT 100`;
    const [rows] = await req.db.execute(sql, args);
    res.json({ groups: rows });
  } catch (e) {
    console.error('List groups error:', e);
    res.status(500).json({ message: 'Failed to list groups' });
  }
});

// My groups (created or joined)
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT g.*, m.role AS myRole
       FROM study_group_members m
       JOIN study_groups g ON g.id = m.groupId
       WHERE m.userId = ?
       ORDER BY g.createdAt DESC`,
      [req.user.userId]
    );
    res.json({ groups: rows });
  } catch (e) {
    console.error('My groups error:', e);
    res.status(500).json({ message: 'Failed to fetch my groups' });
  }
});

// Join a group (students only)
router.post('/:groupId/join', authenticateToken, ensureStudent, async (req, res) => {
  const { groupId } = req.params;
  try {
    await req.db.execute(
      `INSERT IGNORE INTO study_group_members (groupId, userId, role) VALUES (?, ?, 'member')`,
      [groupId, req.user.userId]
    );
    res.json({ success: true, message: 'Joined group' });
  } catch (e) {
    console.error('Join group error:', e);
    res.status(500).json({ message: 'Failed to join group' });
  }
});

// Leave a group
router.post('/:groupId/leave', authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  try {
    // prevent owner from leaving if they are the only owner (simple guard)
    const [[ownerCount]] = await req.db.execute(
      `SELECT COUNT(*) AS owners 
       FROM study_group_members 
       WHERE groupId=? AND role='owner'`,
      [groupId]
    );
    const [[isOwner]] = await req.db.execute(
      `SELECT COUNT(*) AS meOwner 
       FROM study_group_members 
       WHERE groupId=? AND userId=? AND role='owner'`,
      [groupId, req.user.userId]
    );
    if (isOwner.meOwner && ownerCount.owners <= 1) {
      return res.status(400).json({ message: 'Transfer ownership before leaving' });
    }

    await req.db.execute(
      `DELETE FROM study_group_members WHERE groupId=? AND userId=?`,
      [groupId, req.user.userId]
    );
    res.json({ success: true, message: 'Left group' });
  } catch (e) {
    console.error('Leave group error:', e);
    res.status(500).json({ message: 'Failed to leave group' });
  }
});

// Group details (members list)
router.get('/:groupId', authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  try {
    const [[group]] = await req.db.execute(
      `SELECT * FROM study_groups WHERE id=?`,
      [groupId]
    );
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const [members] = await req.db.execute(
      `SELECT u.id, u.firstName, u.lastName, u.email, u.studentId, m.role
       FROM study_group_members m
       JOIN users u ON u.id = m.userId
       WHERE m.groupId=?
       ORDER BY m.role DESC, u.firstName ASC`,
      [groupId]
    );

    res.json({ group, members });
  } catch (e) {
    console.error('Group details error:', e);
    res.status(500).json({ message: 'Failed to fetch group details' });
  }
});

module.exports = router;