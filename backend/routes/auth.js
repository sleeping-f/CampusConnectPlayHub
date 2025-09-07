const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const router = express.Router();

/* Profile image upload setup */
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
/* End profile image upload setup */

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware to verify JWT token
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

// Validation middleware
const validateRegistration = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('campus_id').trim().isLength({ min: 8 }).withMessage('Campus ID must be required for users and must be at least 8 characters long'),
  body('role').isIn(['student', 'manager', 'admin']).withMessage('Invalid role'),
  // student-only requirements
  body('department').if(body('role').equals('student')).trim().notEmpty().withMessage(' Department is required for students')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register user with profile image upload support
router.post('/register', uploadProfileImage, validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let { firstName, lastName, email, password, campus_id, department, role } = req.body;

    // normalize inputs
    role = (role || 'student').toLowerCase();
    if (!['student', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // department only required for students
    if (role === 'student') {
      if (!department || !department.trim()) {
        return res.status(400).json({ message: 'Department is required for students' });
      }
      department = department.trim();
    }

    // unique email check
    const [email_rows] = await req.db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (email_rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // unique campus_id check
    const [campus_id_rows] = await req.db.execute(
      'SELECT id FROM users WHERE campus_id = ?',
      [campus_id]
    );
    if (campus_id_rows.length > 0) {
      return res.status(400).json({ message: 'Campus ID must be unique for users' });
    }

    // hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get relative path if user uploaded a profile image
    const relProfile = req.file ? `/uploads/profile/${req.file.filename}` : null;

    // Insert user into database with profile image
    const [result] = await req.db.execute(
      `INSERT INTO users (firstName, lastName, email, password, campus_id, role, profileImage)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, hashedPassword, campus_id, role, relProfile]
    );

    // Insert student record if user is a student
    if (role === 'student') {
      await req.db.execute(
        `INSERT INTO students (user_id, department) VALUES (?, ?)`,
        [result.insertId, department]
      );
    }

    // Retrieve the created user with profile image
    const [[user]] = await req.db.execute(
      `SELECT 
         u.id,
         u.firstName,
         u.lastName,
         u.email,
         u.role,
         u.campus_id,
         u.profileImage,
         s.department
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = ?`,
      [result.insertId]
    );

    // Generate JWT token for the user
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response with user data and token
    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        campus_id: user.campus_id,
        department: user.department ?? null,
        role: user.role,
        profileImage: user.profileImage || null
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
});


// Login user and return profile data
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Get user by email for password verification
    const [rows] = await req.db.execute(
      `SELECT id, firstName, lastName, email, password, campus_id, role, createdAt, profileImage
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Verify password hash
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Get department for students
    let department = null;
    if (user.role === 'student') {
      const [[deptRow]] = await req.db.execute(
        `SELECT department FROM students WHERE user_id = ?`,
        [user.id]
      );
      department = deptRow ? deptRow.department : null;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        campus_id: user.campus_id,
        department,
        role: user.role,
        profileImage: user.profileImage || null
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});


// Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, sub: googleId } = payload;

    // Check if user exists
    const [existingUsers] = await req.db.execute(
      'SELECT * FROM users WHERE email = ? OR googleId = ?',
      [email, googleId]
    );

    let user;

    if (existingUsers.length > 0) {
      user = existingUsers[0];
      if (!user.googleId) {
        await req.db.execute(
          'UPDATE users SET googleId = ? WHERE id = ?',
          [googleId, user.id]
        );
      }
    } else {
      // Create new user with Google ID
      const [result] = await req.db.execute(
        `INSERT INTO users (firstName, lastName, email, password, campus_id, role, googleId)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [given_name, family_name, email, 'google_oauth', null, 'student', googleId]
      );

      const [[created]] = await req.db.execute(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      user = created;
    }

    // Get department for student users
    let department = null;
    if (user.role === 'student') {
      const [[deptRow]] = await req.db.execute(
        `SELECT department FROM students WHERE user_id = ?`,
        [user.id]
      );
      department = deptRow ? deptRow.department : null;
    }

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Google login successful',
      token: jwtToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        campus_id: user.campus_id,
        department,
        role: user.role,
        profileImage: user.profileImage || null
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ message: 'Google login failed' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Get user data from database
    const [[user]] = await req.db.execute(
      `SELECT id, firstName, lastName, email, campus_id, role, createdAt, profileImage
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get department for student users
    let department = null;
    if (user.role === 'student') {
      const [[deptRow]] = await req.db.execute(
        `SELECT department FROM students WHERE user_id = ?`,
        [user.id]
      );
      department = deptRow ? deptRow.department : null;
    }

    return res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        campus_id: user.campus_id,
        department,
        role: user.role,
        createdAt: user.createdAt,
        profileImage: user.profileImage || null
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ message: 'Failed to get user data' });
  }
});

// Change password
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user with password
    const [users] = await req.db.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await req.db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
