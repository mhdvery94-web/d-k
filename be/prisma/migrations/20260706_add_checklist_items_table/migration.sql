CREATE TABLE `checklist_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `menu_id` INT NOT NULL,
  `menu_name` VARCHAR(200) NOT NULL,
  `quantity` INT NOT NULL,
  `checked` BOOLEAN DEFAULT FALSE,
  `checked_at` DATETIME NULL,
  `checked_by` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME DEFAULT NOW(),
  `updatedAt` DATETIME DEFAULT NOW() ON UPDATE NOW(),
  
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_menu_id` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;