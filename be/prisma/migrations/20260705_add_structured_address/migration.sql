ALTER TABLE `pending_payments`
  ADD COLUMN `customer_postal_code` VARCHAR(10) NULL,
  ADD COLUMN `customer_kelurahan` VARCHAR(100) NULL,
  ADD COLUMN `customer_kecamatan` VARCHAR(100) NULL,
  ADD COLUMN `customer_kota` VARCHAR(100) NULL,
  ADD COLUMN `customer_provinsi` VARCHAR(100) NULL;

ALTER TABLE `orders`
  ADD COLUMN `customer_postal_code` VARCHAR(10) NULL,
  ADD COLUMN `customer_kelurahan` VARCHAR(100) NULL,
  ADD COLUMN `customer_kecamatan` VARCHAR(100) NULL,
  ADD COLUMN `customer_kota` VARCHAR(100) NULL,
  ADD COLUMN `customer_provinsi` VARCHAR(100) NULL;
