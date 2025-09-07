const express = require('express');
const jwt = require('jsonwebtoken');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

/* ====== ADD: minimal upload wiring for optional profileImage ====== */
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const PROFILE_DIR = path.join(__dirname, '..', 'uploads', 'profile');
if (!fs.existsSync(PROFILE_DIR)) {
  try { fs.mkdirSync(PROFILE_DIR, { recursive: true }); } catch { }
}
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, PROFILE_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg').toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const fileFilter = (_, file, cb) => {
  const ok = /^image\/(png|jpe?g|webp)$/i.test(file.mimetype);
  cb(ok ? null : new Error('Only PNG/JPG/WEBP allowed'), ok);
};
const uploadProfileImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
}).single('profileImage');
/* ================================================================ */

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
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
    // Include profile image
    profileImage: row.profileImage ?? null,
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
        u.createdAt, u.updatedAt,
        u.profileImage,             -- ADD
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
          u.profileImage,           -- ADD
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
  // Handle optional profile image upload
  (req, res, next) => uploadProfileImage(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Invalid image' });
    next();
  }),
  body('firstName').optional().isString().isLength({ min: 1, max: 100 }),
  body('lastName').optional().isString().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().isLength({ max: 255 }),
  body('campus_id').optional().isString().isLength({ min: 1, max: 50 }),
  body('department').optional().isString().isLength({ min: 1, max: 100 }),
  async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    const id = req.user.id;
    const { firstName, lastName, email, campus_id, department } = req.body ?? {};

    console.log('PATCH /users/me - User ID:', id);
    console.log('PATCH /users/me - Request body:', req.body);
    console.log('PATCH /users/me - Database connection:', !!req.db);

    try {
      if (!req.db) {
        console.error('Database connection not available');
        return res.status(500).json({ message: 'Database connection not available' });
      }

      const [[current]] = await req.db.execute(
        `SELECT id, role FROM users WHERE id = ?`,
        [id]
      );
      if (!current) return res.status(404).json({ message: 'User not found' });

      const setParts = [];
      const params = [];

      if (typeof firstName !== 'undefined') { setParts.push('firstName = ?'); params.push(firstName); }
      if (typeof lastName !== 'undefined') { setParts.push('lastName = ?'); params.push(lastName); }
      if (typeof email !== 'undefined') { setParts.push('email = ?'); params.push(email); }
      if (typeof campus_id !== 'undefined') { setParts.push('campus_id = ?'); params.push(campus_id); }

      // Update profile image if a new file was uploaded
      if (req.file) {
        const rel = `/uploads/profile/${req.file.filename}`;
        setParts.push('profileImage = ?');
        params.push(rel);
      }

      const willUpdateUsers = setParts.length > 0;
      const wantsDeptChange = typeof department !== 'undefined';

      if (!willUpdateUsers && !wantsDeptChange) {
        return res.status(400).json({ message: 'Nothing to update' });
      }

      // Get a connection from the pool for transactions
      const connection = await req.db.getConnection();
      try {
        await connection.beginTransaction();

        if (willUpdateUsers) {
          const sql = `UPDATE users SET ${setParts.join(', ')} WHERE id = ?`;
          params.push(id);
          console.log('Executing SQL:', sql, 'with params:', params);
          await connection.execute(sql, params);
        }

        if (wantsDeptChange && current.role === 'student') {
          const [sRows] = await connection.execute(
            `SELECT user_id FROM students WHERE user_id = ?`,
            [id]
          );
          if (sRows.length === 0) {
            await connection.execute(
              `INSERT INTO students (user_id, department) VALUES (?, ?)`,
              [id, department]
            );
          } else {
            await connection.execute(
              `UPDATE students SET department = ? WHERE user_id = ?`,
              [department, id]
            );
          }
        }

        await connection.commit();
      } catch (txErr) {
        await connection.rollback();
        console.error('Transaction error:', txErr);
        throw txErr;
      } finally {
        connection.release();
      }

      // Re-select with LEFT JOIN (include profileImage)
      const [rows] = await req.db.execute(
        `
        SELECT
          u.id, u.firstName, u.lastName, u.email, u.role, u.campus_id,
          u.createdAt, u.updatedAt,
          u.profileImage,          -- ADD
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
      console.error('Error stack:', err.stack);
      return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  }
);

module.exports = router;
