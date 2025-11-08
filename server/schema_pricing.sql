-- Pricing / Scheme Engine Schema
-- Run this after the main schema.sql

USE retailer_pro;

-- Discount Rules table
CREATE TABLE IF NOT EXISTS discount_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ruleType ENUM('percentage', 'fixed', 'buy_x_get_y', 'free_shipping') NOT NULL,
  discountValue DECIMAL(10, 2) NOT NULL,
  minPurchaseAmount DECIMAL(10, 2) DEFAULT 0,
  maxDiscountAmount DECIMAL(10, 2),
  applicableTo ENUM('all', 'category', 'product', 'user', 'user_group') DEFAULT 'all',
  applicableToId INT,
  startDate DATE,
  endDate DATE,
  maxUses INT,
  maxUsesPerUser INT,
  priority INT DEFAULT 0,
  isActive BOOLEAN DEFAULT TRUE,
  conditions JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ruleType (ruleType),
  INDEX idx_applicableTo (applicableTo),
  INDEX idx_isActive (isActive),
  INDEX idx_startDate (startDate),
  INDEX idx_endDate (endDate),
  INDEX idx_priority (priority)
);

-- Slab Pricing table
CREATE TABLE IF NOT EXISTS slab_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  productId INT,
  categoryId INT,
  minQuantity INT NOT NULL,
  maxQuantity INT,
  price DECIMAL(10, 2) NOT NULL,
  discountPercentage DECIMAL(5, 2) DEFAULT 0,
  isActive BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  conditions JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  INDEX idx_categoryId (categoryId),
  INDEX idx_minQuantity (minQuantity),
  INDEX idx_isActive (isActive),
  INDEX idx_priority (priority)
);

-- Promo Codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discountType ENUM('percentage', 'fixed', 'free_shipping') NOT NULL,
  discountValue DECIMAL(10, 2) NOT NULL,
  minPurchaseAmount DECIMAL(10, 2) DEFAULT 0,
  maxDiscountAmount DECIMAL(10, 2),
  applicableTo ENUM('all', 'category', 'product', 'user', 'user_group') DEFAULT 'all',
  applicableToId INT,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  maxUses INT,
  maxUsesPerUser INT,
  usedCount INT DEFAULT 0,
  isActive BOOLEAN DEFAULT TRUE,
  conditions JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_isActive (isActive),
  INDEX idx_startDate (startDate),
  INDEX idx_endDate (endDate)
);

-- Promo Code Usage table
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  promoCodeId INT NOT NULL,
  userId INT NOT NULL,
  orderId INT,
  orderNumber VARCHAR(100),
  discountAmount DECIMAL(10, 2) NOT NULL,
  usedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promoCodeId) REFERENCES promo_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_promoCodeId (promoCodeId),
  INDEX idx_userId (userId),
  INDEX idx_orderId (orderId),
  INDEX idx_usedAt (usedAt)
);

-- Tax Rules table (GST)
CREATE TABLE IF NOT EXISTS tax_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  taxType ENUM('GST', 'VAT', 'CST', 'SGST', 'CGST', 'IGST') DEFAULT 'GST',
  taxRate DECIMAL(5, 2) NOT NULL,
  applicableTo ENUM('all', 'category', 'product', 'state') DEFAULT 'all',
  applicableToId INT,
  stateCode VARCHAR(10),
  hsnCode VARCHAR(50),
  isActive BOOLEAN DEFAULT TRUE,
  effectiveFrom DATE,
  effectiveTo DATE,
  conditions JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_taxType (taxType),
  INDEX idx_applicableTo (applicableTo),
  INDEX idx_isActive (isActive),
  INDEX idx_hsnCode (hsnCode),
  INDEX idx_stateCode (stateCode)
);

-- Credit Limits table
CREATE TABLE IF NOT EXISTS credit_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  userType ENUM('retailer', 'distributor', 'customer') NOT NULL,
  creditLimit DECIMAL(10, 2) NOT NULL,
  usedCredit DECIMAL(10, 2) DEFAULT 0,
  availableCredit DECIMAL(10, 2) GENERATED ALWAYS AS (creditLimit - usedCredit) STORED,
  paymentTerms INT DEFAULT 0,
  gracePeriod INT DEFAULT 0,
  interestRate DECIMAL(5, 2) DEFAULT 0,
  isActive BOOLEAN DEFAULT TRUE,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_userType (userType),
  INDEX idx_isActive (isActive)
);

-- Payment Terms table
CREATE TABLE IF NOT EXISTS payment_terms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  paymentDays INT NOT NULL,
  gracePeriod INT DEFAULT 0,
  interestRate DECIMAL(5, 2) DEFAULT 0,
  lateFeePercentage DECIMAL(5, 2) DEFAULT 0,
  applicableTo ENUM('all', 'user', 'user_group', 'order_type') DEFAULT 'all',
  applicableToId INT,
  isActive BOOLEAN DEFAULT TRUE,
  conditions JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_paymentDays (paymentDays),
  INDEX idx_applicableTo (applicableTo),
  INDEX idx_isActive (isActive)
);

-- Pricing Calculation Log table (for audit)
CREATE TABLE IF NOT EXISTS pricing_calculations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT,
  userId INT,
  productId INT,
  basePrice DECIMAL(10, 2) NOT NULL,
  discountAmount DECIMAL(10, 2) DEFAULT 0,
  slabDiscountAmount DECIMAL(10, 2) DEFAULT 0,
  promoCodeId INT,
  promoDiscountAmount DECIMAL(10, 2) DEFAULT 0,
  taxAmount DECIMAL(10, 2) DEFAULT 0,
  taxRate DECIMAL(5, 2) DEFAULT 0,
  finalPrice DECIMAL(10, 2) NOT NULL,
  calculationDetails JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES customer_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (promoCodeId) REFERENCES promo_codes(id) ON DELETE SET NULL,
  INDEX idx_orderId (orderId),
  INDEX idx_userId (userId),
  INDEX idx_productId (productId),
  INDEX idx_createdAt (createdAt)
);

