CREATE TABLE `otp_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL,
  `hashed_otp` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `attempts` INT DEFAULT 0,
  `used` BOOLEAN DEFAULT FALSE,
  `createdAt` DATETIME DEFAULT NOW(),
  INDEX `idx_email` (`email`),
  INDEX `idx_expires_at` (`expires_at`)
);