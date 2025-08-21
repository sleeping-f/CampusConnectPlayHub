const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await req.db.execute(
      `SELECT id, firstName, lastName, email, studentId, department, role, 
              profileImage, createdAt, updatedAt 
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: users[0] });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('studentId').optional().trim().isLength({ min: 1 }).withMessage('Student ID cannot be empty'),
  body('department').optional().trim().isLength({ min: 1 }).withMessage('Department cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, studentId, department } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('firstName = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('lastName = ?');
      values.push(lastName);
    }
    if (studentId !== undefined) {
      updates.push('studentId = ?');
      values.push(studentId);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.user.userId);

    await req.db.execute(
      `UPDATE users SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated user
    const [users] = await req.db.execute(
      `SELECT id, firstName, lastName, email, studentId, department, role, 
              profileImage, createdAt, updatedAt 
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: users[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, department, role } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let query = `
      SELECT id, firstName, lastName, email, studentId, department, role, profileImage
      FROM users 
      WHERE id != ?
    `;
    const values = [req.user.userId];

    // Add search conditions
    if (q) {
      query += ` AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR studentId LIKE ?)`;
      const searchTerm = `%${q}%`;
      values.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (department) {
      query += ` AND department = ?`;
      values.push(department);
    }

    if (role) {
      query += ` AND role = ?`;
      values.push(role);
    }

    query += ` ORDER BY firstName, lastName LIMIT ? OFFSET ?`;
    values.push(limit, offset);

    const [users] = await req.db.execute(query, values);

    res.json({ users });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

// Send friend request
router.post('/friends/request', authenticateToken, [
  body('friendId').isInt().withMessage('Valid friend ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { friendId } = req.body;

    // Check if friend exists
    const [friends] = await req.db.execute(
      'SELECT id FROM users WHERE id = ?',
      [friendId]
    );

    if (friends.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already friends or request pending
    const [existingRequests] = await req.db.execute(
      'SELECT * FROM friends WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)',
      [req.user.userId, friendId, friendId, req.user.userId]
    );

    if (existingRequests.length > 0) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    // Create friend request
    await req.db.execute(
      'INSERT INTO friends (userId, friendId, status) VALUES (?, ?, "pending")',
      [req.user.userId, friendId]
    );

    // Create notification for friend
    await req.db.execute(
      `INSERT INTO notifications (userId, title, message, type) 
       VALUES (?, ?, ?, "friend_request")`,
      [
        friendId,
        'New Friend Request',
        `You have a new friend request from ${req.user.firstName || 'a user'}`,
      ]
    );

    res.json({ message: 'Friend request sent successfully' });

  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Failed to send friend request' });
  }
});

// Accept/Reject friend request
router.put('/friends/respond', authenticateToken, [
  body('friendId').isInt().withMessage('Valid friend ID is required'),
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { friendId, action } = req.body;

    // Update friend request status
    const [result] = await req.db.execute(
      'UPDATE friends SET status = ? WHERE userId = ? AND friendId = ? AND status = "pending"',
      [action === 'accept' ? 'accepted' : 'rejected', friendId, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Create notification for the requester
    const [requester] = await req.db.execute(
      'SELECT firstName FROM users WHERE id = ?',
      [friendId]
    );

    await req.db.execute(
      `INSERT INTO notifications (userId, title, message, type) 
       VALUES (?, ?, ?, "friend_request")`,
      [
        friendId,
        'Friend Request Response',
        `Your friend request was ${action}ed by ${req.user.firstName || 'a user'}`,
      ]
    );

    res.json({ message: `Friend request ${action}ed successfully` });

  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ message: 'Failed to respond to friend request' });
  }
});

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const [friends] = await req.db.execute(
      `SELECT u.id, u.firstName, u.lastName, u.email, u.studentId, u.department, u.role, u.profileImage, f.status, f.createdAt
       FROM friends f
       JOIN users u ON (f.userId = u.id OR f.friendId = u.id)
       WHERE (f.userId = ? OR f.friendId = ?) AND u.id != ? AND f.status = 'accepted'
       ORDER BY u.firstName, u.lastName`,
      [req.user.userId, req.user.userId, req.user.userId]
    );

    res.json({ friends });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Failed to get friends' });
  }
});

// Get pending friend requests
router.get('/friends/pending', authenticateToken, async (req, res) => {
  try {
    const [requests] = await req.db.execute(
      `SELECT u.id, u.firstName, u.lastName, u.email, u.studentId, u.department, u.role, u.profileImage, f.createdAt
       FROM friends f
       JOIN users u ON f.userId = u.id
       WHERE f.friendId = ? AND f.status = 'pending'
       ORDER BY f.createdAt DESC`,
      [req.user.userId]
    );

    res.json({ requests });

  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'Failed to get pending requests' });
  }
});

// Remove friend
router.delete('/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;

    // Remove friendship (both directions)
    await req.db.execute(
      'DELETE FROM friends WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)',
      [req.user.userId, friendId, friendId, req.user.userId]
    );

    res.json({ message: 'Friend removed successfully' });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Failed to remove friend' });
  }
});

// Get notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const [notifications] = await req.db.execute(
      `SELECT id, title, message, type, isRead, createdAt
       FROM notifications 
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.user.userId, limit, offset]
    );

    res.json({ notifications });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await req.db.execute(
      'UPDATE notifications SET isRead = TRUE WHERE id = ? AND userId = ?',
      [id, req.user.userId]
    );

    res.json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await req.db.execute(
      'UPDATE notifications SET isRead = TRUE WHERE userId = ?',
      [req.user.userId]
    );

    res.json({ message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

// Get routines for a specific user (friend)
router.get('/:userId/routines', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if the user is a friend
    const [friendship] = await req.db.execute(
      `SELECT id FROM friends 
       WHERE ((userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)) 
       AND status = 'accepted'`,
      [req.user.userId, userId, userId, req.user.userId]
    );

    if (friendship.length === 0) {
      return res.status(403).json({ message: 'Access denied. User is not your friend.' });
    }

    // Get user's routines
    const [routines] = await req.db.execute(
      `SELECT id, day, startTime, endTime, activity, location, type, createdAt, updatedAt
       FROM routines 
       WHERE userId = ?
       ORDER BY day, startTime`,
      [userId]
    );

    res.json({ routines });

  } catch (error) {
    console.error('Get user routines error:', error);
    res.status(500).json({ message: 'Failed to get user routines' });
  }
});

module.exports = router;
