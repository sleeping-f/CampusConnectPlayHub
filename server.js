const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const routineRoutes = require('./routes/routines');
const feedbackRoutes = require("./routes/feedback");
const bugRoutes = require("./routes/bugs");
const studyGroupsRoutes = require("./routes/study_groups");
 
// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const createDatabaseConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'campus_connect',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('✅ Database connected successfully');
    return connection;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Initialize database
const initializeDatabase = async (connection) => {
  try {
    // Create users table (Superclass)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT NOT NULL,
        firstName VARCHAR(50) NOT NULL,
        lastName VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        userId VARCHAR(50) NOT NULL UNIQUE,      -- external/human campus ID
        role ENUM('student', 'manager', 'admin') DEFAULT 'student',
        googleId VARCHAR(100),
        profileImage VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        PRIMARY KEY (id)
      );
    `);

// === Subclass tables (each row corresponds 1:1 with users.id) ===

    // Admins
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        user_id INT PRIMARY KEY,
        CONSTRAINT fk_admin_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    // Managers
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS managers (
        user_id INT PRIMARY KEY,
        CONSTRAINT fk_manager_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    // Students
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS students (
        user_id INT PRIMARY KEY,
        bio TEXT NULL,
        year TINYINT UNSIGNED NULL,
        friend_count INT UNSIGNED NOT NULL DEFAULT 0,
        campus_coin INT UNSIGNED NOT NULL DEFAULT 0,
        department VARCHAR(100) NULL,
        CONSTRAINT fk_student_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    // Create routines table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS routines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId INT NOT NULL,
        day ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL,
        activity VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        type ENUM('class', 'study', 'break', 'activity') DEFAULT 'class',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create friends table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS friends (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId INT NOT NULL,
        friendId INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friendId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_friendship (studentId, friendId)
      );
    `);

    // create study groups table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        creatorId INT NOT NULL,          -- users.id (student who created)
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (creatorId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // create memberships table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        groupId INT NOT NULL,
        userId INT NOT NULL,
        role ENUM('member','owner') DEFAULT 'member',
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_group_member (groupId, userId),
        FOREIGN KEY (groupId) REFERENCES study_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('friend_request', 'routine_reminder', 'system', 'achievement') DEFAULT 'system',
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Feedback table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId INT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Bug reports table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        severity ENUM('low', 'medium', 'high') DEFAULT 'low',
        status ENUM('open', 'in_progress', 'resolved') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Make database connection available to routes
app.use(async (req, res, next) => {
  try {
    if (!req.db) {
      req.db = await createDatabaseConnection();
    }
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routines', routineRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/bugs", bugRoutes);
app.use('/api/study_groups', studyGroupsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'CampusConnectPlayHub API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize database
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});