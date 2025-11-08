-- Inventory Service Schema
-- Run this after the main schema.sql

USE retailer_pro;

-- Warehouses/Shops table
CREATE TABLE IF NOT EXISTS warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  type ENUM('warehouse', 'shop', 'store') DEFAULT 'warehouse',
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  contactPerson VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_type (type),
  INDEX idx_isActive (isActive)
);

-- Stock Inventory table
CREATE TABLE IF NOT EXISTS stock_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  warehouseId INT NOT NULL,
  batchNumber VARCHAR(100),
  expiryDate DATE,
  quantity INT NOT NULL DEFAULT 0,
  reservedQuantity INT DEFAULT 0,
  availableQuantity INT GENERATED ALWAYS AS (quantity - reservedQuantity) STORED,
  costPrice DECIMAL(10, 2),
  sellingPrice DECIMAL(10, 2),
  stockMethod ENUM('FIFO', 'LIFO') DEFAULT 'FIFO',
  location VARCHAR(255),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  INDEX idx_warehouseId (warehouseId),
  INDEX idx_batchNumber (batchNumber),
  INDEX idx_expiryDate (expiryDate),
  INDEX idx_stockMethod (stockMethod),
  INDEX idx_availableQuantity (availableQuantity)
);

-- Purchase Order Reservations table
CREATE TABLE IF NOT EXISTS po_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poNumber VARCHAR(100) NOT NULL,
  productId INT NOT NULL,
  warehouseId INT NOT NULL,
  stockInventoryId INT,
  batchNumber VARCHAR(100),
  quantity INT NOT NULL,
  reservedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reservedBy INT,
  status ENUM('reserved', 'confirmed', 'cancelled', 'fulfilled') DEFAULT 'reserved',
  expiryDate DATE,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (stockInventoryId) REFERENCES stock_inventory(id) ON DELETE SET NULL,
  INDEX idx_poNumber (poNumber),
  INDEX idx_productId (productId),
  INDEX idx_warehouseId (warehouseId),
  INDEX idx_status (status),
  INDEX idx_reservedAt (reservedAt)
);

-- Stock Events table (for publishing events)
CREATE TABLE IF NOT EXISTS stock_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  warehouseId INT,
  eventType ENUM('stock_low', 'stock_debited', 'stock_added', 'stock_reserved', 'stock_released', 'expiry_warning') NOT NULL,
  quantity INT,
  batchNumber VARCHAR(100),
  previousQuantity INT,
  currentQuantity INT,
  threshold INT,
  message TEXT,
  metadata JSON,
  isPublished BOOLEAN DEFAULT FALSE,
  publishedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL,
  INDEX idx_productId (productId),
  INDEX idx_warehouseId (warehouseId),
  INDEX idx_eventType (eventType),
  INDEX idx_isPublished (isPublished),
  INDEX idx_createdAt (createdAt)
);

-- Stock Transactions table (for audit trail)
CREATE TABLE IF NOT EXISTS stock_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  warehouseId INT NOT NULL,
  stockInventoryId INT,
  transactionType ENUM('in', 'out', 'adjustment', 'reservation', 'release', 'transfer') NOT NULL,
  quantity INT NOT NULL,
  batchNumber VARCHAR(100),
  referenceType VARCHAR(50),
  referenceId INT,
  notes TEXT,
  createdBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (stockInventoryId) REFERENCES stock_inventory(id) ON DELETE SET NULL,
  INDEX idx_productId (productId),
  INDEX idx_warehouseId (warehouseId),
  INDEX idx_transactionType (transactionType),
  INDEX idx_createdAt (createdAt)
);

