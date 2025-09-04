const express = require('express');
const jwt = require('jsonwebtoken');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

// ---------- Auth middleware ----------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
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

// ---------- Helpers ----------
function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return null;
}

function shapeProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    campus_id: row.campus_id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
    department: row.department ?? null,
    profileImage: row.profileImage ?? null, // ✅ added
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

// ---------- GET /api/users/me ----------
// Use LEFT JOIN so admins/managers resolve without students row.
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const id = req.user.id;
    const [rows] = await req.db.execute(
      `
      SELECT
        u.id, u.firstName, u.lastName, u.email, u.role, u.campus_id,
        u.profileImage, -- ✅ added
        u.createdAt, u.updatedAt,
        s.department
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      WHERE u.id = ?
      `,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    return res.json({ profile: shapeProfile(rows[0]) });
  } catch (err) {
    console.error('GET /users/me error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------- GET /api/users/search ----------
// Keep this students-only (INNER JOIN).
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

      const [rows] = await req.db.execute(
        `
        SELECT
          u.id, u.firstName, u.lastName, u.email, u.campus_id, u.role, u.createdAt,
          u.profileImage, -- ✅ added
          s.department
        FROM users u
        INNER JOIN students s ON s.user_id = u.id
        WHERE
          u.firstName LIKE ?
          OR u.lastName LIKE ?
          OR u.email LIKE ?
          OR u.campus_id LIKE ?
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

// ---------- PATCH /api/users/me ----------
// Updates users; upserts department only if role === 'student'.
// Return result with LEFT JOIN.
router.patch(
  '/me',
  authenticateToken,
  body('firstName').optional().isString().isLength({ min: 1, max: 100 }),
  body('lastName').optional().isString().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().isLength({ max: 255 }),
  body('department').optional().isString().isLength({ min: 1, max: 100 }),
  body('profileImage').optional().isString().isLength({ min: 1, max: 255 }), // ✅ added
  async (req, res) => {
    if (sendValidationErrors(req, res)) return;
    console.log("PATCH /users/me body:", req.body);


    const id = req.user.id;
    const { firstName, lastName, email, department, profileImage } = req.body ?? {};

    try {
      const [[current]] = await req.db.execute(
        `SELECT id, role FROM users WHERE id = ?`,
        [id]
      );
      if (!current) return res.status(404).json({ message: 'User not found' });

      const setParts = [];
      const params = [];

      if (typeof firstName !== 'undefined') { setParts.push('firstName = ?'); params.push(firstName); }
      if (typeof lastName !== 'undefined')  { setParts.push('lastName = ?');  params.push(lastName);  }
      if (typeof email !== 'undefined')     { setParts.push('email = ?');     params.push(email);     }
      if (typeof profileImage !== 'undefined') { setParts.push('profileImage = ?'); params.push(profileImage); } // ✅ added

      const willUpdateUsers = setParts.length > 0;
      const wantsDeptChange = typeof department !== 'undefined';

      if (!willUpdateUsers && !wantsDeptChange) {
        return res.status(400).json({ message: 'Nothing to update' });
      }

      await req.db.beginTransaction();
      try {
        if (willUpdateUsers) {
          const sql = `UPDATE users SET ${setParts.join(', ')} WHERE id = ?`;
          params.push(id);
          await req.db.execute(sql, params);
        }

        if (wantsDeptChange && current.role === 'student') {
          const [sRows] = await req.db.execute(
            `SELECT user_id FROM students WHERE user_id = ?`,
            [id]
          );
          if (sRows.length === 0) {
            await req.db.execute(
              `INSERT INTO students (user_id, department) VALUES (?, ?)` ,
              [id, department]
            );
          } else {
            await req.db.execute(
              `UPDATE students SET department = ? WHERE user_id = ?`,
              [department, id]
            );
          }
        }

        await req.db.commit();
      } catch (txErr) {
        await req.db.rollback();
        throw txErr;
      }

      // Re-select with LEFT JOIN
      const [rows] = await req.db.execute(
        `
        SELECT
          u.id, u.firstName, u.lastName, u.email, u.role, u.campus_id,
          u.profileImage, -- ✅ added
          u.createdAt, u.updatedAt,
          s.department
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        WHERE u.id = ?
        `,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ message: 'User not found after update' });
      return res.json({ profile: shapeProfile(rows[0]) });
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email already in use' });
      }
      console.error('PATCH /users/me error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

module.exports = router;
