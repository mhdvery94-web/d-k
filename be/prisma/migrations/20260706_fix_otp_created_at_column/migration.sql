-- Fix otp_tokens: rename camelCase column to snake_case to match Prisma schema @map
ALTER TABLE `otp_tokens` CHANGE COLUMN `createdAt` `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
