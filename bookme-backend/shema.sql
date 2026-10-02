-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  sex VARCHAR(20),
  dob DATE,
  profile_pic VARCHAR(255),
  verified TINYINT(1) DEFAULT 0
);

-- Posts table (text, photos, videos)
CREATE TABLE IF NOT EXISTS posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  content TEXT,
  media_type ENUM('text', 'photo', 'video') DEFAULT 'text',
  media_url VARCHAR(255),
  media_urls TEXT,
  likes_count INT DEFAULT 0,
  report_count INT DEFAULT 0,
  is_flagged TINYINT(1) DEFAULT 0,
  report_status ENUM('active', 'taken_down') DEFAULT 'active',
  viewer_discretion TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reported content log
CREATE TABLE IF NOT EXISTS reported_contents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  reporter_user_id VARCHAR(255) NOT NULL,
  reason VARCHAR(100) DEFAULT 'spam',
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_report (post_id, reporter_user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  post_id INT NOT NULL,
  reply_to INT NULL,
  comment TEXT NOT NULL,
  like_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_to) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comment_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  comment_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_comment_like (user_id, comment_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS recommendation_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  post_id INT NULL,
  target_user_id VARCHAR(255) NULL,
  event_type ENUM('like', 'share', 'comment', 'follow_user', 'comment_like', 'view') NOT NULL,
  weight DECIMAL(5,2) DEFAULT 1.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recommendation_user_created (user_id, created_at DESC),
  INDEX idx_recommendation_post (post_id),
  INDEX idx_recommendation_target_user (target_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipient_user_id VARCHAR(255) NOT NULL,
  actor_user_id VARCHAR(255) NOT NULL,
  type ENUM('follow', 'like', 'comment', 'comment_like', 'share', 'welcome') NOT NULL,
  target_type ENUM('user', 'post', 'comment') NOT NULL,
  target_id VARCHAR(255) NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_created (recipient_user_id, created_at DESC),
  INDEX idx_notifications_unread (recipient_user_id, is_read),
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
);