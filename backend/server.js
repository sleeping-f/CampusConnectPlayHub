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
const gamesRoutes = require('./routes/games');

const app = express();

/* ------------------------- CORS: PERMISSIVE FOR DEV ------------------------- */
const corsOptions = {
  origin: (origin, cb) => cb(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});
/* --------------------------------------------------------------------------- */

app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));

// Create rate limiter but exclude auth routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow 1000 requests per 15 minutes (much more generous for development)
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authentication routes
    return req.path.startsWith('/api/auth/');
  }
});

// Apply rate limiter to all routes except auth
// TEMPORARILY DISABLED FOR DEVELOPMENT - UNCOMMENT FOR PRODUCTION
/*
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/')) {
    return next(); // Skip rate limiting for auth routes
  }
  return limiter(req, res, next);
});
*/

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* --------------------------- DB: connection pool -------------------- */
const createDatabasePool = () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'campus_connect',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    });
    console.log('✅ Database pool created successfully');
    return pool;
  } catch (error) {
    console.error('❌ Database pool creation failed:', error);
    process.exit(1);
  }
};

const dbPool = createDatabasePool();

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
    `);

    // Create friends table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS friends (
        student_id_1 INT NOT NULL,
        student_id_2 INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (student_id_1, student_id_2),
        CONSTRAINT friends_ordered CHECK (student_id_1 <> student_id_2),
        CONSTRAINT fk_student1 FOREIGN KEY (student_id_1) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_student2 FOREIGN KEY (student_id_2) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create study_groups table
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

    // Create memberships table
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
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('friend_request','routine_reminder','system','achievement') DEFAULT 'system',
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

    // Create games table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        max_players INT NOT NULL DEFAULT 2,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create game_rooms table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_code VARCHAR(10) NOT NULL UNIQUE,
        game_id INT NOT NULL,
        creator_id INT NOT NULL,
        status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
        current_player_id INT NULL,
        game_state JSON NULL,
        winner_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_room_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        CONSTRAINT fk_room_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_room_current_player FOREIGN KEY (current_player_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_room_winner FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Create game_room_players table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_room_players (
        room_id INT NOT NULL,
        player_id INT NOT NULL,
        player_symbol VARCHAR(5) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, player_id),
        CONSTRAINT fk_grp_room FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
        CONSTRAINT fk_grp_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create game_statistics table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        wins INT UNSIGNED DEFAULT 0,
        losses INT UNSIGNED DEFAULT 0,
        draws INT UNSIGNED DEFAULT 0,
        total_games INT UNSIGNED DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_game (user_id, game_id),
        CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_stats_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Insert default games
    await connection.execute(`
      INSERT IGNORE INTO games (name, description, max_players) VALUES 
      ('tic-tac-toe', 'Classic Tic Tac Toe game', 2),
      ('connect-four', 'Connect Four game (coming soon)', 2),
      ('chess', 'Chess game (coming soon)', 2)
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

app.use((req, res, next) => {
  req.db = dbPool;
  next();
});

app.set('trust proxy', 1);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/study-groups', studyGroupsRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', gamesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CampusConnectPlayHub API is running', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    // Initialize database using the pool
    await initializeDatabase(dbPool);

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

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  dbPool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  dbPool.end();
  process.exit(0);
});
