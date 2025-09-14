-- Database initialization script for CampusConnectPlayHub
-- This script will be executed when the MySQL container starts for the first time

USE campus_connect;

-- Create users table
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

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  user_id INT PRIMARY KEY,
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create managers table
CREATE TABLE IF NOT EXISTS managers (
  user_id INT PRIMARY KEY,
  CONSTRAINT fk_manager_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  user_id INT PRIMARY KEY,
  bio TEXT NULL,
  year TINYINT UNSIGNED NULL,
  friend_count INT UNSIGNED NOT NULL DEFAULT 0,
  campus_coin INT UNSIGNED NOT NULL DEFAULT 0,
  department VARCHAR(100) NOT NULL,
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create routines table
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

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  student_id_1 INT NOT NULL,
  student_id_2 INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id_1, student_id_2),
  CONSTRAINT friends_ordered CHECK (student_id_1 <> student_id_2),
  CONSTRAINT fk_student1 FOREIGN KEY (student_id_1) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_student2 FOREIGN KEY (student_id_2) REFERENCES users(id) ON DELETE CASCADE
);

-- Create study_groups table
CREATE TABLE IF NOT EXISTS study_groups (
  group_id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  description TEXT,
  creator_id INT NOT NULL,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sg_creator FOREIGN KEY (creator_id) REFERENCES students(user_id) ON DELETE CASCADE
);

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  sgroup_id INT NOT NULL,
  student_id INT NOT NULL,
  role ENUM('member','creator') DEFAULT 'member',
  date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sgm_group FOREIGN KEY (sgroup_id) REFERENCES study_groups(group_id) ON DELETE CASCADE,
  CONSTRAINT fk_sgm_student FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL,
  actor_id INT NOT NULL,
  type ENUM('friend_request_received','friend_request_accepted') NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_n_recipient FOREIGN KEY (recipient_id) REFERENCES students(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_n_actor FOREIGN KEY (actor_id) REFERENCES students(user_id) ON DELETE CASCADE,
  UNIQUE KEY uq_once_per_event (type, recipient_id, actor_id),
  CONSTRAINT chk_not_self CHECK (recipient_id <> actor_id),
  INDEX idx_inbox (recipient_id, is_read, created_at)
) ENGINE=InnoDB;

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  message TEXT NOT NULL,
  status   ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  priority ENUM('low','medium','high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Create bug_reports table
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

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  max_players INT NOT NULL DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Create game_rooms table
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

-- Create game_room_players table
CREATE TABLE IF NOT EXISTS game_room_players (
  room_id INT NOT NULL,
  player_id INT NOT NULL,
  player_symbol VARCHAR(5) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, player_id),
  CONSTRAINT fk_grp_room FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_grp_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create game_statistics table
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

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_name VARCHAR(100) NULL,
  type ENUM('direct', 'group') DEFAULT 'direct',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_room_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create chat_room_participants table
CREATE TABLE IF NOT EXISTS chat_room_participants (
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  CONSTRAINT fk_chat_participant_room FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_participant_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('text', 'image', 'file', 'emoji') DEFAULT 'text',
  reply_to_id INT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_message_room FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_message_reply FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Insert default games
INSERT IGNORE INTO games (name, description, max_players) VALUES 
('tic-tac-toe', 'Classic Tic Tac Toe game', 2),
('rock-paper-scissors', 'Rock Paper Scissors - First to 5 wins!', 2);

-- Create a default admin user (password: admin123)
INSERT IGNORE INTO users (firstName, lastName, email, password, campus_id, role) VALUES 
('Admin', 'User', 'admin@campusconnect.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN001', 'admin');

-- Insert admin record
INSERT IGNORE INTO admins (user_id) SELECT id FROM users WHERE email = 'admin@campusconnect.com';

-- Create a default student user (password: student123)
INSERT IGNORE INTO users (firstName, lastName, email, password, campus_id, role) VALUES 
('John', 'Doe', 'student@campusconnect.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'STU001', 'student');

-- Insert student record
INSERT IGNORE INTO students (user_id, bio, year, department) 
SELECT id, 'Default student user for testing', 2, 'Computer Science' 
FROM users WHERE email = 'student@campusconnect.com';
