// notifications.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, param, query, validationResult } = require('express-validator');

module.exports = function createNotificationsRouter(connection) {
  const router = express.Router();

  // ---------------- Auth (exact pattern you provided) ----------------
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access token required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid or expired token' });
      req.user = user; // user.id is PK from users table
      next();
    });
  };

  // --------------- Helpers ----------------

  // Map users.id from JWT to students.user_id (FK target for notifications)
  async function getStudentIdForUser(usersId) {
    // Assumes students.user_id references users.id 1:1
    const [rows] = await connection.execute(
      'SELECT user_id FROM students WHERE user_id = ? LIMIT 1',
      [usersId]
    );
    if (!rows.length) {
      const err = new Error('Student profile not found for this user');
      err.status = 404;
      throw err;
    }
    return rows[0].user_id;
  }

  async function ensureStudentExists(student_user_id) {
    const [rows] = await connection.execute(
      'SELECT 1 FROM students WHERE user_id = ? LIMIT 1',
      [student_user_id]
    );
    return rows.length === 1;
  }

  async function createNotification({ recipient_id, acceptor_id, type, title, message }) {
    // Respect UNIQUE(type, acceptor_id, recipient_id)
    const [res] = await connection.execute(
      `
      INSERT IGNORE INTO notifications
        (recipient_id, acceptor_id, type, title, message)
      VALUES (?, ?, ?, ?, ?)
      `,
      [recipient_id, acceptor_id, type, title, message]
    );
    return res.insertId || null;
  }

  // --------------- Routes ----------------

  // GET /api/notifications?unreadOnly=true&page=1&limit=20
  router.get(
    '/',
    authenticateToken,
    [
      query('unreadOnly').optional().isBoolean().toBoolean(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const unreadOnly = req.query.unreadOnly === true;
        const page = req.query.page || 1;
        const limit = req.query.limit || 20;

        const recipient_student_id = await getStudentIdForUser(req.user.id);

        const where = ['recipient_id = ?'];
        const params = [recipient_student_id];

        if (unreadOnly) {
          where.push('is_read = 0');
        }

        const base = `FROM notifications WHERE ${where.join(' AND ')}`;

        const [rows] = await connection.execute(
          `
          SELECT
            notification_id, recipient_id, acceptor_id, type,
            title, message, is_read, read_at, created_at
          ${base}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
          `,
          [...params, limit, (page - 1) * limit]
        );

        const [[{ total }]] = await connection.execute(
          `SELECT COUNT(*) AS total ${base}`,
          params
        );

        res.json({ rows, total, page, limit });
      } catch (err) {
        console.error('GET /api/notifications error:', err);
        res.status(err.status || 500).json({ message: err.message || 'Failed to load notifications' });
      }
    }
  );

  // PATCH /api/notifications/:notification_id/read
  router.patch(
    '/:notification_id/read',
    authenticateToken,
    [param('notification_id').isInt().toInt()],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const recipient_student_id = await getStudentIdForUser(req.user.id);
        const notification_id = req.params.notification_id;

        const [result] = await connection.execute(
          `
          UPDATE notifications
          SET is_read = 1, read_at = IFNULL(read_at, NOW())
          WHERE notification_id = ? AND recipient_id = ?
          LIMIT 1
          `,
          [notification_id, recipient_student_id]
        );

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Notification marked as read' });
      } catch (err) {
        console.error('PATCH /api/notifications/:notification_id/read error:', err);
        res.status(err.status || 500).json({ message: err.message || 'Failed to update notification' });
      }
    }
  );

  // PATCH /api/notifications/mark-all-read
  router.patch(
    '/mark-all-read',
    authenticateToken,
    async (req, res) => {
      try {
        const recipient_student_id = await getStudentIdForUser(req.user.id);
        const [result] = await connection.execute(
          `
          UPDATE notifications
          SET is_read = 1, read_at = IFNULL(read_at, NOW())
          WHERE recipient_id = ? AND is_read = 0
          `,
          [recipient_student_id]
        );
        res.json({ message: 'All notifications marked as read', updated: result.affectedRows });
      } catch (err) {
        console.error('PATCH /api/notifications/mark-all-read error:', err);
        res.status(err.status || 500).json({ message: err.message || 'Failed to update notifications' });
      }
    }
  );

  // POST /api/notifications/from-friend-request
  // Creates a 'friend_request_received' notification for the requestee.
  // Body: requester_student_id, requestee_student_id
  router.post(
    '/from-friend-request',
    authenticateToken,
    [
      body('requester_student_id').isInt().toInt(),
      body('requestee_student_id').isInt().toInt(),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { requester_student_id, requestee_student_id } = req.body;

        if (requester_student_id === requestee_student_id) {
          return res.status(400).json({ message: 'requester_student_id and requestee_student_id must differ' });
        }

        // Ensure both exist in students
        const [aExists, bExists] = await Promise.all([
          ensureStudentExists(requester_student_id),
          ensureStudentExists(requestee_student_id),
        ]);
        if (!aExists || !bExists) {
          return res.status(400).json({ message: 'Invalid student id(s)' });
        }

        const title = 'New Friend Request';
        const message = 'You received a new friend request.';

        const inserted_id = await createNotification({
          recipient_id: requestee_student_id,
          acceptor_id: requester_student_id,
          type: 'friend_request_received',
          title,
          message,
        });

        res.status(201).json({ notification_id: inserted_id, duplicate: inserted_id === null });
      } catch (err) {
        console.error('POST /api/notifications/from-friend-request error:', err);
        res.status(500).json({ message: 'Failed to create notification' });
      }
    }
  );

  // POST /api/notifications/from-friend-accept
  // Creates a 'friend_request_accepted' notification for the original requester.
  // Body: accepter_student_id, requester_student_id
  router.post(
    '/from-friend-accept',
    authenticateToken,
    [
      body('accepter_student_id').isInt().toInt(),
      body('requester_student_id').isInt().toInt(),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { accepter_student_id, requester_student_id } = req.body;

        if (accepter_student_id === requester_student_id) {
          return res.status(400).json({ message: 'accepter_student_id and requester_student_id must differ' });
        }

        const [aExists, rExists] = await Promise.all([
          ensureStudentExists(accepter_student_id),
          ensureStudentExists(requester_student_id),
        ]);
        if (!aExists || !rExists) {
          return res.status(400).json({ message: 'Invalid student id(s)' });
        }

        const title = 'Friend Request Accepted';
        const message = 'Your friend request was accepted.';

        const inserted_id = await createNotification({
          recipient_id: requester_student_id,
          acceptor_id: accepter_student_id, // user who triggered the event
          type: 'friend_request_accepted',
          title,
          message,
        });

        res.status(201).json({ notification_id: inserted_id, duplicate: inserted_id === null });
      } catch (err) {
        console.error('POST /api/notifications/from-friend-accept error:', err);
        res.status(500).json({ message: 'Failed to create notification' });
      }
    }
  );

  // (Optional) Raw create endpoint if you want to insert from anywhere
  // Body: recipient_id, acceptor_id, type, title, message
  router.post(
    '/',
    authenticateToken,
    [
      body('recipient_id').isInt().toInt(),
      body('acceptor_id').isInt().toInt(),
      body('type').isIn(['friend_request_received', 'friend_request_accepted']),
      body('title').isString().isLength({ min: 1, max: 100 }),
      body('message').isString().isLength({ min: 1 }),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { recipient_id, acceptor_id, type, title, message } = req.body;

        if (recipient_id === acceptor_id) {
          return res.status(400).json({ message: 'recipient_id and acceptor_id must differ' });
        }

        const [rExists, aExists] = await Promise.all([
          ensureStudentExists(recipient_id),
          ensureStudentExists(acceptor_id),
        ]);
        if (!rExists || !aExists) {
          return res.status(400).json({ message: 'Invalid student id(s)' });
        }

        const inserted_id = await createNotification({ recipient_id, acceptor_id, type, title, message });
        res.status(201).json({ notification_id: inserted_id, duplicate: inserted_id === null });
      } catch (err) {
        console.error('POST /api/notifications error:', err);
        res.status(500).json({ message: 'Failed to create notification' });
      }
    }
  );

  return router;
};