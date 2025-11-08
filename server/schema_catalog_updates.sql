-- Catalog/Product Service Schema Updates
-- Run this after the main schema.sql

USE retailer_pro;

-- Product SKUs table
CREATE TABLE IF NOT EXISTS product_skus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  variantName VARCHAR(255),
  variantValue VARCHAR(255),
  price DECIMAL(10, 2),
  stockQuantity INT DEFAULT 0,
  barcode VARCHAR(100),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  INDEX idx_sku (sku),
  INDEX idx_barcode (barcode)
);

-- Price Tiers table
CREATE TABLE IF NOT EXISTS price_tiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  tierName VARCHAR(100) NOT NULL,
  minQuantity INT NOT NULL,
  maxQuantity INT,
  price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(5, 2) DEFAULT 0,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  INDEX idx_minQuantity (minQuantity)
);

-- Unit Conversions table
CREATE TABLE IF NOT EXISTS unit_conversions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  fromUnit VARCHAR(50) NOT NULL,
  toUnit VARCHAR(50) NOT NULL,
  conversionFactor DECIMAL(10, 4) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  UNIQUE KEY unique_conversion (productId, fromUnit, toUnit)
);

-- Substitute Products table
CREATE TABLE IF NOT EXISTS substitute_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  substituteProductId INT NOT NULL,
  priority INT DEFAULT 0,
  reason TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (substituteProductId) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  INDEX idx_substituteProductId (substituteProductId),
  UNIQUE KEY unique_substitute (productId, substituteProductId)
);

-- Product Search Index table
CREATE TABLE IF NOT EXISTS product_search_index (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  searchText TEXT NOT NULL,
  keywords JSON,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_product (productId),
  FULLTEXT INDEX idx_searchText (searchText)
);

-- Add SKU column to products table if it doesn't exist
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE, so we'll use a different approach
-- Run this manually if needed:
-- ALTER TABLE products ADD COLUMN sku VARCHAR(100) AFTER id;
-- ALTER TABLE products ADD COLUMN searchKeywords TEXT AFTER description;
-- ALTER TABLE products ADD UNIQUE INDEX idx_sku (sku);

