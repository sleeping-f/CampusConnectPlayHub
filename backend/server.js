// server.js
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql2/promise');

dotenv.config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const routineRoutes = require('./routes/routines');
const friendsRoutes = require('./routes/friends');
const feedbackRoutes = require('./routes/feedback');
const bugRoutes = require('./routes/bugs');
const studyGroupsRoutes = require("./routes/study-groups");
const membershipsRoutes = require('./routes/memberships');
const adminRoutes = require('./routes/admin');

const app = express();

/* ------------------------- CORS: PERMISSIVE FOR DEV ------------------------- */
// Allow any origin in dev to eliminate preflight issues while debugging
const corsOptions = {
  origin: (origin, cb) => cb(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
// Fast-path preflight so it always carries CORS headers
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});
/* --------------------------------------------------------------------------- */

// Security middleware AFTER CORS
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));

// Rate limiting AFTER CORS
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* --------------------------- DB: connection per request -------------------- */
const createDatabaseConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'campus_connect',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('✅ Database connected successfully');
    return connection;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

const initializeDatabase = async (connection) => {
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(50) NOT NULL,
        lastName VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        campus_id VARCHAR(50) NOT NULL UNIQUE,
        role ENUM('student','manager','admin') DEFAULT 'student',
        googleId VARCHAR(100),
        profileImage VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        user_id INT PRIMARY KEY,
        CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS managers (
        user_id INT PRIMARY KEY,
        CONSTRAINT fk_manager_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS students (
        user_id INT PRIMARY KEY,
        bio TEXT NULL,
        year TINYINT UNSIGNED NULL,
        friend_count INT UNSIGNED NOT NULL DEFAULT 0,
        campus_coin INT UNSIGNED NOT NULL DEFAULT 0,
        department VARCHAR(100) NOT NULL,
        CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS routines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        day ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL,
        activity VARCHAR(100) NOT NULL,
        location VARCHAR(100) NOT NULL,
        type ENUM('class','study','break','activity') DEFAULT 'class',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS friends (
        student_id_1 INT NOT NULL,
        student_id_2 INT NOT NULL,
        status ENUM('pending','accepted','rejected') DEFAULT 'pending',
        dateAdded TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (student_id_1, student_id_2),
        CONSTRAINT friends_ordered CHECK (student_id_1 <> student_id_2),
        CONSTRAINT fk_student1 FOREIGN KEY (student_id_1) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_student2 FOREIGN KEY (student_id_2) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_groups (
        group_id INT AUTO_INCREMENT PRIMARY KEY,
        group_name VARCHAR(100) NOT NULL,
        description TEXT,
        creator_id INT NOT NULL,
        date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sg_creator FOREIGN KEY (creator_id) REFERENCES students(user_id) ON DELETE CASCADE
      );
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS memberships (
        sgroup_id INT NOT NULL,
        student_id INT NOT NULL,
        role ENUM('member','creator') DEFAULT 'member',
        date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sgm_group FOREIGN KEY (sgroup_id) REFERENCES study_groups(group_id) ON DELETE CASCADE,
        CONSTRAINT fk_sgm_student FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('friend_request','routine_reminder','system','achievement') DEFAULT 'system',
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        message TEXT NOT NULL,
        status   ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
        priority ENUM('low','medium','high') DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        severity ENUM('low','medium','high','critical') DEFAULT 'low',
        status   ENUM('open','triaged','in_progress','fixed','closed') NOT NULL DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_bug_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

app.use(async (req, res, next) => {
  try {
    if (!req.db) req.db = await createDatabaseConnection();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

app.set('trust proxy', 1);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/study-groups', studyGroupsRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/admin', adminRoutes);

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CampusConnectPlayHub API is running', timestamp: new Date().toISOString() });
});

// Errors
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    const connection = await createDatabaseConnection();
    await initializeDatabase(connection);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};
startServer();

process.on('SIGTERM', () => { console.log('SIGTERM received, shutting down gracefully'); process.exit(0); });
process.on('SIGINT', () => { console.log('SIGINT received, shutting down gracefully'); process.exit(0); });
