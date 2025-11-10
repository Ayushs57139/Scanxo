-- Payment/Finance Module Database Schema
-- PCI Compliant design with tokenization support

-- Payment Gateways Configuration table
CREATE TABLE IF NOT EXISTS payment_gateways (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE, -- 'razorpay', 'stripe', 'payu', etc.
  displayName VARCHAR(255) NOT NULL,
  gatewayType ENUM('razorpay', 'stripe', 'payu', 'paytm', 'phonepe', 'custom') NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  isTestMode BOOLEAN DEFAULT TRUE,
  apiKey VARCHAR(500), -- Encrypted in production
  apiSecret VARCHAR(500), -- Encrypted in production
  webhookSecret VARCHAR(500), -- Encrypted in production
  merchantId VARCHAR(255),
  config JSON, -- Additional gateway-specific configuration
  supportedPaymentMethods JSON, -- ['card', 'upi', 'netbanking', 'wallet', etc.]
  supportedCurrencies JSON DEFAULT '["INR"]',
  feeStructure JSON, -- Fee calculation rules
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_isActive (isActive),
  INDEX idx_gatewayType (gatewayType)
);

-- Payment Tokens table (PCI Compliant - stores tokenized card data)
CREATE TABLE IF NOT EXISTS payment_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  gatewayId INT NOT NULL,
  token VARCHAR(500) NOT NULL, -- Gateway-provided token
  tokenType ENUM('card', 'upi', 'wallet', 'netbanking') NOT NULL,
  maskedCardNumber VARCHAR(20), -- Last 4 digits only
  cardBrand VARCHAR(50), -- 'visa', 'mastercard', 'rupay', etc.
  expiryMonth INT,
  expiryYear INT,
  cardHolderName VARCHAR(255),
  isDefault BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  metadata JSON, -- Additional token metadata
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (gatewayId) REFERENCES payment_gateways(id) ON DELETE RESTRICT,
  INDEX idx_userId (userId),
  INDEX idx_gatewayId (gatewayId),
  INDEX idx_token (token(100)),
  INDEX idx_isActive (isActive)
);

-- Payments table (Main payment records)
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paymentNumber VARCHAR(100) UNIQUE NOT NULL,
  userId VARCHAR(100) NOT NULL,
  orderId INT,
  outstandingId INT,
  gatewayId INT,
  tokenId INT, -- Reference to payment_tokens if using saved token
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  paymentMethod ENUM('card', 'upi', 'netbanking', 'wallet', 'bank_transfer', 'cheque', 'credit', 'cash') NOT NULL,
  paymentStatus ENUM('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
  gatewayTransactionId VARCHAR(255), -- Gateway's transaction ID
  gatewayOrderId VARCHAR(255), -- Gateway's order ID
  gatewayPaymentId VARCHAR(255), -- Gateway's payment ID
  failureReason TEXT,
  failureCode VARCHAR(100),
  metadata JSON, -- Additional payment data from gateway
  ipAddress VARCHAR(45),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (gatewayId) REFERENCES payment_gateways(id) ON DELETE SET NULL,
  FOREIGN KEY (tokenId) REFERENCES payment_tokens(id) ON DELETE SET NULL,
  INDEX idx_paymentNumber (paymentNumber),
  INDEX idx_userId (userId),
  INDEX idx_orderId (orderId),
  INDEX idx_outstandingId (outstandingId),
  INDEX idx_gatewayId (gatewayId),
  INDEX idx_paymentStatus (paymentStatus),
  INDEX idx_gatewayTransactionId (gatewayTransactionId),
  INDEX idx_createdAt (createdAt)
);

-- Payment Transactions table (Detailed transaction log)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paymentId INT NOT NULL,
  transactionType ENUM('payment', 'refund', 'partial_refund', 'chargeback', 'reversal') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  gatewayTransactionId VARCHAR(255),
  gatewayResponse JSON, -- Full gateway response
  status ENUM('pending', 'success', 'failed', 'cancelled') DEFAULT 'pending',
  failureReason TEXT,
  failureCode VARCHAR(100),
  processedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE CASCADE,
  INDEX idx_paymentId (paymentId),
  INDEX idx_transactionType (transactionType),
  INDEX idx_status (status),
  INDEX idx_gatewayTransactionId (gatewayTransactionId),
  INDEX idx_createdAt (createdAt)
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  refundNumber VARCHAR(100) UNIQUE NOT NULL,
  paymentId INT NOT NULL,
  orderId INT,
  userId VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  refundType ENUM('full', 'partial') NOT NULL,
  refundReason TEXT,
  refundStatus ENUM('pending', 'processing', 'success', 'failed', 'cancelled') DEFAULT 'pending',
  gatewayRefundId VARCHAR(255),
  gatewayResponse JSON,
  failureReason TEXT,
  processedBy VARCHAR(100), -- Admin user ID
  processedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE RESTRICT,
  INDEX idx_refundNumber (refundNumber),
  INDEX idx_paymentId (paymentId),
  INDEX idx_orderId (orderId),
  INDEX idx_userId (userId),
  INDEX idx_refundStatus (refundStatus),
  INDEX idx_gatewayRefundId (gatewayRefundId),
  INDEX idx_createdAt (createdAt)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceNumber VARCHAR(100) UNIQUE NOT NULL,
  orderId INT,
  userId VARCHAR(100) NOT NULL,
  invoiceType ENUM('sales', 'credit_note', 'debit_note', 'proforma') DEFAULT 'sales',
  invoiceDate DATE NOT NULL,
  dueDate DATE,
  subtotal DECIMAL(10, 2) NOT NULL,
  taxAmount DECIMAL(10, 2) DEFAULT 0,
  discountAmount DECIMAL(10, 2) DEFAULT 0,
  shippingAmount DECIMAL(10, 2) DEFAULT 0,
  totalAmount DECIMAL(10, 2) NOT NULL,
  paidAmount DECIMAL(10, 2) DEFAULT 0,
  balanceAmount DECIMAL(10, 2) NOT NULL,
  invoiceStatus ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  billingAddress TEXT,
  shippingAddress TEXT,
  items JSON, -- Invoice line items
  taxDetails JSON, -- Tax breakdown
  notes TEXT,
  termsAndConditions TEXT,
  pdfPath VARCHAR(500), -- Path to generated PDF
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invoiceNumber (invoiceNumber),
  INDEX idx_orderId (orderId),
  INDEX idx_userId (userId),
  INDEX idx_invoiceStatus (invoiceStatus),
  INDEX idx_invoiceDate (invoiceDate),
  INDEX idx_dueDate (dueDate)
);

-- Payment Reconciliations table
CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reconciliationNumber VARCHAR(100) UNIQUE NOT NULL,
  gatewayId INT NOT NULL,
  reconciliationDate DATE NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  totalTransactions INT DEFAULT 0,
  totalAmount DECIMAL(10, 2) DEFAULT 0,
  matchedTransactions INT DEFAULT 0,
  matchedAmount DECIMAL(10, 2) DEFAULT 0,
  unmatchedTransactions INT DEFAULT 0,
  unmatchedAmount DECIMAL(10, 2) DEFAULT 0,
  discrepancyCount INT DEFAULT 0,
  reconciliationStatus ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  gatewayStatement JSON, -- Gateway statement data
  discrepancies JSON, -- List of discrepancies
  notes TEXT,
  reconciledBy VARCHAR(100), -- Admin user ID
  reconciledAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (gatewayId) REFERENCES payment_gateways(id) ON DELETE RESTRICT,
  INDEX idx_reconciliationNumber (reconciliationNumber),
  INDEX idx_gatewayId (gatewayId),
  INDEX idx_reconciliationDate (reconciliationDate),
  INDEX idx_reconciliationStatus (reconciliationStatus)
);

-- Reconciliation Matches table (Links payments to gateway transactions)
CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reconciliationId INT NOT NULL,
  paymentId INT,
  gatewayTransactionId VARCHAR(255) NOT NULL,
  matchStatus ENUM('matched', 'unmatched', 'discrepancy') DEFAULT 'matched',
  paymentAmount DECIMAL(10, 2),
  gatewayAmount DECIMAL(10, 2),
  discrepancyAmount DECIMAL(10, 2) DEFAULT 0,
  discrepancyReason TEXT,
  matchedAt TIMESTAMP NULL,
  FOREIGN KEY (reconciliationId) REFERENCES payment_reconciliations(id) ON DELETE CASCADE,
  FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE SET NULL,
  INDEX idx_reconciliationId (reconciliationId),
  INDEX idx_paymentId (paymentId),
  INDEX idx_gatewayTransactionId (gatewayTransactionId),
  INDEX idx_matchStatus (matchStatus)
);

-- Accounting Exports table
CREATE TABLE IF NOT EXISTS accounting_exports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exportNumber VARCHAR(100) UNIQUE NOT NULL,
  exportType ENUM('payments', 'invoices', 'refunds', 'reconciliations', 'all') NOT NULL,
  format ENUM('csv', 'xlsx', 'json', 'xml', 'tally') DEFAULT 'csv',
  startDate DATE,
  endDate DATE,
  filters JSON, -- Export filters
  filePath VARCHAR(500),
  fileSize INT,
  recordCount INT DEFAULT 0,
  exportStatus ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  errorMessage TEXT,
  exportedBy VARCHAR(100), -- Admin user ID
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP NULL,
  INDEX idx_exportNumber (exportNumber),
  INDEX idx_exportType (exportType),
  INDEX idx_exportStatus (exportStatus),
  INDEX idx_createdAt (createdAt)
);

-- Payment Webhooks table (For gateway webhook events)
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gatewayId INT NOT NULL,
  eventType VARCHAR(100) NOT NULL, -- 'payment.success', 'payment.failed', 'refund.processed', etc.
  webhookId VARCHAR(255), -- Gateway's webhook ID
  payload JSON NOT NULL, -- Full webhook payload
  signature VARCHAR(500), -- Webhook signature for verification
  isVerified BOOLEAN DEFAULT FALSE,
  isProcessed BOOLEAN DEFAULT FALSE,
  processingError TEXT,
  processedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gatewayId) REFERENCES payment_gateways(id) ON DELETE CASCADE,
  INDEX idx_gatewayId (gatewayId),
  INDEX idx_eventType (eventType),
  INDEX idx_webhookId (webhookId),
  INDEX idx_isProcessed (isProcessed),
  INDEX idx_createdAt (createdAt)
);

