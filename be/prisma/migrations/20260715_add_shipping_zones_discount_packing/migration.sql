-- CreateTable: shipping_zones
CREATE TABLE `shipping_zones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode_zona` VARCHAR(10) NOT NULL,
    `jarak_min` FLOAT NOT NULL,
    `jarak_max` FLOAT NULL,
    `tarif` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shipping_zones_kode_zona_key`(`kode_zona`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: app_settings
CREATE TABLE `app_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: pending_payments
ALTER TABLE `pending_payments`
    ADD COLUMN `discount_percent` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `packing_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `shipping_zone_code` VARCHAR(10) NULL,
    ADD COLUMN `shipping_distance_km` FLOAT NULL,
    MODIFY COLUMN `delivery_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- AlterTable: orders
ALTER TABLE `orders`
    ADD COLUMN `discount_percent` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `packing_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `shipping_zone_code` VARCHAR(10) NULL,
    ADD COLUMN `shipping_distance_km` FLOAT NULL,
    MODIFY COLUMN `delivery_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0;
