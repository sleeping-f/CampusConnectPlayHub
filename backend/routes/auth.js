const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const router = express.Router();

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

// Register user
router.post('/register', validateRegistration, async (req, res) => {
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

    // insert into users (NOTE: users table has NO department column)
    const [result] = await req.db.execute(
      `INSERT INTO users (firstName, lastName, email, password, campus_id, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, hashedPassword, campus_id, role]
    );

    // insert student row if needed (FK = numeric users.id)
    if (role === 'student') {
      await req.db.execute(
        `INSERT INTO students (user_id, department) VALUES (?, ?)`,
        [result.insertId, department]
      );
    }

    // read back the joined user
    const [[user]] = await req.db.execute(
      `SELECT 
         u.id,
         u.firstName,
         u.lastName,
         u.email,
         u.role,
         u.campus_id,
         s.department
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = ?`,
      [result.insertId]
    );

    // generate JWT with numeric id
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // single, final response (no unreachable code)
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
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
});


// Login user
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

    // 1) Get user by email (NO joins; get password for comparison)
    const [rows] = await req.db.execute(
      `SELECT id, firstName, lastName, email, password, campus_id, role, createdAt
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    // 2) Verify password hash
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3) If student, fetch department from students table (NO join)
    let department = null;
    if (user.role === 'student') {
      const [[deptRow]] = await req.db.execute(
        `SELECT department FROM students WHERE user_id = ?`,
        [user.id]
      );
      department = deptRow ? deptRow.department : null;
    }

    // 4) JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5) Response (don’t include password)
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
        role: user.role
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
      // Create new user (6 columns → 6 values)
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

    // If the new/returning user is a student and has no students row yet, you may choose to create one later after collecting department.
    // For now, just compute department if present:
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
        role: user.role
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ message: 'Google login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // 1) Read from users only
    const [[user]] = await req.db.execute(
      `SELECT id, firstName, lastName, email, campus_id, role, createdAt
       FROM users
       WHERE id = ?`,
      [req.user.id]  // <-- you were missing this comma before
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2) If student, pick department from students
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
        createdAt: user.createdAt
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

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;