-- AlterTable: Add email column to users table
ALTER TABLE `users` ADD COLUMN `email` VARCHAR(100) NULL;

-- Update existing admin user with default email
UPDATE `users` SET `email` = 'admin@dapurkemas.com' WHERE `username` = 'admin';

-- Make email NOT NULL and add unique constraint
ALTER TABLE `users` MODIFY COLUMN `email` VARCHAR(100) NOT NULL;
ALTER TABLE `users` ADD UNIQUE INDEX `users_email_key`(`email`);
