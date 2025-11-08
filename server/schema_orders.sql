-- Order / PO Service Schema
-- Run this after the main schema.sql

USE retailer_pro;

-- Purchase Orders (POs) table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poNumber VARCHAR(100) UNIQUE NOT NULL,
  supplierId INT,
  supplierName VARCHAR(255),
  warehouseId INT NOT NULL,
  status ENUM('created', 'pending_approval', 'approved', 'confirmed', 'packed', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled') DEFAULT 'created',
  totalAmount DECIMAL(10, 2) DEFAULT 0,
  taxAmount DECIMAL(10, 2) DEFAULT 0,
  discountAmount DECIMAL(10, 2) DEFAULT 0,
  finalAmount DECIMAL(10, 2) DEFAULT 0,
  orderDate DATE NOT NULL,
  expectedDeliveryDate DATE,
  actualDeliveryDate DATE,
  approvedBy INT,
  approvedAt TIMESTAMP NULL,
  createdBy INT,
  notes TEXT,
  cancellationReason TEXT,
  cancelledBy INT,
  cancelledAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE RESTRICT,
  INDEX idx_poNumber (poNumber),
  INDEX idx_status (status),
  INDEX idx_warehouseId (warehouseId),
  INDEX idx_orderDate (orderDate)
);

-- Purchase Order Items table
CREATE TABLE IF NOT EXISTS po_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poId INT NOT NULL,
  productId INT NOT NULL,
  productName VARCHAR(255),
  sku VARCHAR(100),
  quantity INT NOT NULL,
  unitPrice DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  taxRate DECIMAL(5, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL,
  batchNumber VARCHAR(100),
  expiryDate DATE,
  receivedQuantity INT DEFAULT 0,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (poId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_poId (poId),
  INDEX idx_productId (productId)
);

-- Customer Orders table
CREATE TABLE IF NOT EXISTS customer_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderNumber VARCHAR(100) UNIQUE NOT NULL,
  userId INT NOT NULL,
  distributorId INT,
  retailerId INT,
  warehouseId INT,
  status ENUM('created', 'confirmed', 'packed', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled', 'returned') DEFAULT 'created',
  orderType ENUM('retail', 'wholesale', 'b2b') DEFAULT 'retail',
  totalAmount DECIMAL(10, 2) DEFAULT 0,
  taxAmount DECIMAL(10, 2) DEFAULT 0,
  discountAmount DECIMAL(10, 2) DEFAULT 0,
  shippingAmount DECIMAL(10, 2) DEFAULT 0,
  finalAmount DECIMAL(10, 2) DEFAULT 0,
  paymentMethod VARCHAR(50),
  paymentStatus ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
  orderDate DATETIME NOT NULL,
  expectedDeliveryDate DATE,
  shippedDate DATETIME,
  deliveredDate DATETIME,
  invoicedDate DATETIME,
  paidDate DATETIME,
  shippingAddress TEXT,
  billingAddress TEXT,
  trackingNumber VARCHAR(100),
  invoiceNumber VARCHAR(100),
  cancellationReason TEXT,
  cancelledBy INT,
  cancelledAt TIMESTAMP NULL,
  returnReason TEXT,
  returnedAt TIMESTAMP NULL,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL,
  INDEX idx_orderNumber (orderNumber),
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_orderDate (orderDate),
  INDEX idx_paymentStatus (paymentStatus)
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  productId INT NOT NULL,
  productName VARCHAR(255),
  sku VARCHAR(100),
  quantity INT NOT NULL,
  unitPrice DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  taxRate DECIMAL(5, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL,
  batchNumber VARCHAR(100),
  expiryDate DATE,
  returnedQuantity INT DEFAULT 0,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES customer_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_orderId (orderId),
  INDEX idx_productId (productId)
);

-- Order Status History table (for state machine tracking)
CREATE TABLE IF NOT EXISTS order_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  orderType ENUM('purchase_order', 'customer_order') NOT NULL,
  status VARCHAR(50) NOT NULL,
  previousStatus VARCHAR(50),
  changedBy INT,
  changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  metadata JSON,
  INDEX idx_orderId (orderId),
  INDEX idx_orderType (orderType),
  INDEX idx_status (status),
  INDEX idx_changedAt (changedAt)
);

-- Order Cancellations table
CREATE TABLE IF NOT EXISTS order_cancellations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  orderType ENUM('purchase_order', 'customer_order') NOT NULL,
  reason TEXT NOT NULL,
  cancelledBy INT,
  cancelledAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  refundAmount DECIMAL(10, 2) DEFAULT 0,
  refundStatus ENUM('pending', 'processed', 'completed') DEFAULT 'pending',
  refundMethod VARCHAR(50),
  refundTransactionId VARCHAR(100),
  notes TEXT,
  FOREIGN KEY (cancelledBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_orderId (orderId),
  INDEX idx_orderType (orderType),
  INDEX idx_cancelledAt (cancelledAt)
);

-- Order Returns table
CREATE TABLE IF NOT EXISTS order_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  orderItemId INT,
  productId INT NOT NULL,
  quantity INT NOT NULL,
  reason TEXT NOT NULL,
  returnType ENUM('full', 'partial') DEFAULT 'partial',
  returnStatus ENUM('requested', 'approved', 'rejected', 'processed', 'completed') DEFAULT 'requested',
  refundAmount DECIMAL(10, 2) DEFAULT 0,
  refundStatus ENUM('pending', 'processed', 'completed') DEFAULT 'pending',
  returnedBy INT,
  returnedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processedBy INT,
  processedAt TIMESTAMP NULL,
  notes TEXT,
  FOREIGN KEY (orderId) REFERENCES customer_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (orderItemId) REFERENCES order_items(id) ON DELETE SET NULL,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_orderId (orderId),
  INDEX idx_orderItemId (orderItemId),
  INDEX idx_returnStatus (returnStatus),
  INDEX idx_returnedAt (returnedAt)
);

