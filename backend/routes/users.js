const express = require('express');
const jwt = require('jsonwebtoken');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

 // Auth middleware (you shared this snippet)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verify error:', err.name, err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Utility: standard error formatter
 */
function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return null;
}

/**
 * Shape a unified profile payload from joined rows.
 */
function shapeProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    campus_id: row.campus_id, // alias for convenience
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
    department: row.department ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

/**
 * GET /api/users/me
 * Return the authenticated user's profile (JOIN users ⟷ students)
 */
router.get(
  '/me',
  authenticateToken,
  async (req, res) => {
    try {
      const id = req.user.id;
      const [rows] = await req.db.execute(
        `
        SELECT u.id, u.firstName, u.lastName, u.email, u.role, u.campus_id, u.createdAt, u.updatedAt,
               s.department
        FROM users u, students s
        WHERE s.user_id = u.id
        AND u.id = ?
        `,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
      return res.json({ profile: shapeProfile(rows[0]) });
    } catch (err) {
      console.error('GET /users/me error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

router.get(
  '/search',
  authenticateToken,
  [
    query('q').trim().isLength({ min: 1 }).withMessage('q is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid query', errors: errors.array() });
    }

    try {
      const q = req.query.q;
      const like = `%${q}%`;
      //const limit = req.query.limit || 20;
      //const offset = req.query.offset || 0;

      // Students only, implicit join form you requested
      const [rows] = await req.db.execute(
        `
        SELECT
          u.id, u.firstName, u.lastName, u.email, u.campus_id, u.role, u.createdAt,
          s.department
        FROM users u, students s
        WHERE u.id = s.user_id
          AND (
            u.firstName LIKE ?
            OR u.lastName LIKE ?
            OR u.email LIKE ?
            OR u.campus_id LIKE ?
          )
        ORDER BY u.firstName, u.lastName
        `,
        [like, like, like, like]
      );

      return res.json({ rows });
    } catch (err) {
      console.error('GET /api/users/search error:', err);
      return res.status(500).json({ message: 'Search failed' });
    }
  }
);

/**
 * PATCH /api/users/me
 * Dynamic UPDATE for users table only (firstName, lastName, email).
 * Upsert department in students if provided AND user.role === 'student'.
 * - If nothing to update on users AND no department change, bail early (400).
 * - Always return the updated profile via JOIN.
 */
router.patch(
  '/me',
  authenticateToken,
  // validate optional fields
  body('firstName').optional().isString().isLength({ min: 1, max: 100 }),
  body('lastName').optional().isString().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().isLength({ max: 255 }),
  body('department').optional().isString().isLength({ min: 1, max: 100 }),
  async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    const id = req.user.id;
    const { firstName, lastName, email, department } = req.body ?? {};

    try {
      // Fetch current role to decide if we can touch students
      const [[current]] = await req.db.execute(
        `SELECT id, role FROM users WHERE id = ?`,
        [id]
      );
      if (!current) return res.status(404).json({ message: 'User not found' });

      // Build dynamic UPDATE for users table
      const setParts = [];
      const params = [];

      if (typeof firstName !== 'undefined') {
        setParts.push('firstName = ?');
        params.push(firstName);
      }
      if (typeof lastName !== 'undefined') {
        setParts.push('lastName = ?');
        params.push(lastName);
      }
      if (typeof email !== 'undefined') {
        setParts.push('email = ?');
        params.push(email);
      }

      const willUpdateUsers = setParts.length > 0;
      const wantsDeptChange = typeof department !== 'undefined';

      // Bail early if nothing to do
      if (!willUpdateUsers && !wantsDeptChange) {
        return res.status(400).json({ message: 'Nothing to update' });
      }

      // Begin transaction to keep things consistent
      await req.db.beginTransaction();
      try {
        // Update users if needed
        if (willUpdateUsers) {
          const sql = `UPDATE users SET ${setParts.join(', ')} WHERE id = ?`;
          params.push(id);
          await req.db.execute(sql, params);
        }

        // Upsert department into students if provided AND role === 'student'
        if (wantsDeptChange) {
          if (current.role !== 'student') {
            // Do NOT create a students row if not a student
            // Silently ignore department if user isn’t a student
          } else {
            // Check if students row exists
            const [sRows] = await req.db.execute(
              `SELECT user_id FROM students WHERE user_id = ?`,
              [id]
            );
            if (sRows.length === 0) {
              // Create students row if department provided and user is actually a student
              await req.db.execute(
                `INSERT INTO students (user_id, department) VALUES (?, ?)`,
                [id, department]
              );
            } else {
              // Update existing row
              await req.db.execute(
                `UPDATE students SET department = ? WHERE user_id = ?`,
                [department, id]
              );
            }
          }
        }

        await req.db.commit();
      } catch (txErr) {
        await req.db.rollback();
        throw txErr;
      }

      // Return updated profile via JOIN
      const [rows] = await req.db.execute(
        `
        SELECT u.id, u.firstName, u.lastName, u.email, u.role, u.createdAt, u.updatedAt,
               s.department
        FROM users u, students s
        WHERE s.user_id = u.id
        AND u.id = ?
        `,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ message: 'User not found after update' });
      return res.json({ profile: shapeProfile(rows[0]) });
    } catch (err) {
      // Handle possible duplicate email error
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email already in use' });
      }
      console.error('PATCH /users/me error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

module.exports = router;