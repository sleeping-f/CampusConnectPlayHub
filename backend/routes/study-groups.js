//study-groups.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Reuse the same auth middleware pattern as your other routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  
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
        `INSERT INTO study_groups (group_name, description, creator_id) VALUES (?, ?, ?)`,
        [name, description || null, req.user.id]
      );

      // auto-add creator as creator
      await req.db.execute(
        `INSERT INTO memberships (sgroup_id, student_id, role) VALUES (?, ?, 'creator')`,
        [result.insertId, req.user.id]
      );

      const [rows] = await req.db.execute(
        `SELECT g.*, 'creator' AS myRole FROM study_groups g WHERE g.group_id = ?`,
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
        EXISTS(SELECT 1 FROM memberships m WHERE m.sgroup_id = g.group_id AND m.student_id = ?) AS isMember
      FROM study_groups g`;
    const args = [req.user.id];
    if (q) {
      sql += ` WHERE g.group_name LIKE ? OR g.description LIKE ?`;
      args.push(`%${q}%`, `%${q}%`);
    }
    sql += ` ORDER BY g.date_created DESC LIMIT 100`;
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
       FROM memberships m
       JOIN study_groups g ON g.group_id = m.sgroup_id
       WHERE m.student_id = ?
       ORDER BY g.date_created DESC`,
      [req.user.id]
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
      `INSERT IGNORE INTO memberships (sgroup_id, student_id, role) VALUES (?, ?, 'member')`,
      [groupId, req.user.id]
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
    // prevent creator from leaving if they are the only creator (simple guard)
    const [[creatorCount]] = await req.db.execute(
      `SELECT COUNT(*) AS creators 
       FROM memberships 
       WHERE sgroup_id = ? AND role = 'creator'`,
      [groupId]
    );
    const [[isCreator]] = await req.db.execute(
      `SELECT COUNT(*) AS meCreator 
       FROM memberships 
       WHERE sgroup_id = ? AND student_id = ? AND role = 'creator'`,
      [groupId, req.user.id]
    );
    if (isCreator.meCreator && creatorCount.creators <= 1) {
      return res.status(400).json({ message: 'Transfer ownership before leaving' });
    }

    await req.db.execute(
      `DELETE FROM memberships WHERE sgroup_id = ? AND student_id = ?`,
      [groupId, req.user.id]
    );
    res.json({ success: true, message: 'Left group' });
  } catch (e) {
    console.error('Leave group error:', e);
    res.status(500).json({ message: 'Failed to leave group' });
  }
});

// DELETE a group (creator only)
router.delete('/:groupId', authenticateToken, ensureStudent, async (req, res) => {
  const { groupId } = req.params;
  try {
    const [[group]] = await req.db.execute(
      `SELECT group_id, creator_id FROM study_groups WHERE group_id = ?`,
      [groupId]
    );
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Only the creator can delete
    if (group.creator_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the creator can delete this group' });
    }

    // memberships.sgroup_id -> study_groups.group_id has ON DELETE CASCADE
    await req.db.execute(`DELETE FROM study_groups WHERE group_id = ?`, [groupId]);
    res.json({ success: true, message: 'Group deleted' });
  } catch (e) {
    console.error('Delete group error:', e);
    res.status(500).json({ message: 'Failed to delete group' });
  }
});

// Group details (members list)
router.get('/:groupId', authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  try {
    const [[group]] = await req.db.execute(
      `SELECT * FROM study_groups WHERE group_id = ?`,
      [groupId]
    );
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const [members] = await req.db.execute(
      `SELECT u.id, u.firstName, u.lastName, u.email, u.campus_id, m.role
       FROM memberships m
       JOIN users u ON u.id = m.student_id
       WHERE m.sgroup_id = ?
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