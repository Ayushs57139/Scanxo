-- Create database
CREATE DATABASE IF NOT EXISTS retailer_pro;
USE retailer_pro;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10, 2),
  retailPrice DECIMAL(10, 2),
  moq INT DEFAULT 0,
  unit VARCHAR(50),
  packSize INT,
  pricePerPack DECIMAL(10, 2),
  stockQuantity INT DEFAULT 0,
  hsnCode VARCHAR(50),
  gstRate DECIMAL(5, 2),
  supplier VARCHAR(255),
  supplierCode VARCHAR(100),
  image TEXT,
  description TEXT,
  volumeDiscounts JSON,
  discount DECIMAL(5, 2) DEFAULT 0,
  isTrending BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  subtitle TEXT,
  image TEXT,
  link VARCHAR(255),
  color VARCHAR(50) DEFAULT '#1E3A8A',
  isSpecialOffer BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100),
  items JSON,
  total DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  paymentMethod VARCHAR(50),
  address JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Retailers table
CREATE TABLE IF NOT EXISTS retailers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  storeName VARCHAR(255),
  storeType VARCHAR(100),
  gstin VARCHAR(50),
  drugLicense VARCHAR(100),
  address JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Distributors table
CREATE TABLE IF NOT EXISTS distributors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  gstin VARCHAR(50),
  drugLicense VARCHAR(100),
  isMapped BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_isMapped (isMapped),
  INDEX idx_priority (priority)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(255) UNIQUE NOT NULL,
  value JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- KYC Profiles table
CREATE TABLE IF NOT EXISTS kyc_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  firstName VARCHAR(255),
  lastName VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  dateOfBirth DATE,
  address JSON,
  panNumber VARCHAR(20),
  aadhaarNumber VARCHAR(20),
  verificationStatus VARCHAR(50) DEFAULT 'pending',
  verifiedAt TIMESTAMP NULL,
  verifiedBy VARCHAR(255),
  verificationNote TEXT,
  businessLicense JSON,
  gstInfo JSON,
  creditLimit JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user (userId)
);

-- KYC Documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  documentType VARCHAR(100) NOT NULL,
  fileName VARCHAR(255),
  filePath VARCHAR(500),
  fileSize INT,
  mimeType VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verifiedAt TIMESTAMP NULL,
  verifiedBy VARCHAR(255)
);

-- KYC Verifications table
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  provider VARCHAR(100),
  documentType VARCHAR(100),
  status VARCHAR(50),
  verificationData JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  points DECIMAL(10, 2) DEFAULT 0,
  totalEarned DECIMAL(10, 2) DEFAULT 0,
  totalRedeemed DECIMAL(10, 2) DEFAULT 0,
  tier VARCHAR(50) DEFAULT 'Bronze',
  status VARCHAR(50) DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user (userId),
  INDEX idx_userId (userId),
  INDEX idx_tier (tier)
);

-- Reward History table
CREATE TABLE IF NOT EXISTS reward_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'earned' or 'redeemed'
  points DECIMAL(10, 2) NOT NULL,
  description TEXT,
  orderId INT,
  transactionId VARCHAR(255),
  status VARCHAR(50) DEFAULT 'completed',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_type (type),
  INDEX idx_createdAt (createdAt)
);

-- Outstanding/Pending Amounts table
CREATE TABLE IF NOT EXISTS outstanding (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  orderId INT,
  invoiceNumber VARCHAR(100),
  amount DECIMAL(10, 2) NOT NULL,
  pendingAmount DECIMAL(10, 2) NOT NULL,
  clearedAmount DECIMAL(10, 2) DEFAULT 0,
  dueDate DATE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partial', 'cleared', 'overdue'
  paymentMethod VARCHAR(50),
  transactionId VARCHAR(255),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_orderId (orderId),
  INDEX idx_status (status),
  INDEX idx_dueDate (dueDate)
);

-- Outstanding Payment History table
CREATE TABLE IF NOT EXISTS outstanding_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  outstandingId INT NOT NULL,
  userId VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paymentMethod VARCHAR(50),
  transactionId VARCHAR(255),
  paymentDate DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_outstandingId (outstandingId),
  INDEX idx_userId (userId),
  INDEX idx_paymentDate (paymentDate),
  FOREIGN KEY (outstandingId) REFERENCES outstanding(id) ON DELETE CASCADE
);

-- Company Offers table
CREATE TABLE IF NOT EXISTS company_offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discount DECIMAL(5, 2) DEFAULT 0,
  discountType VARCHAR(50) DEFAULT 'percentage', -- 'percentage' or 'fixed'
  minPurchaseAmount DECIMAL(10, 2) DEFAULT 0,
  maxDiscountAmount DECIMAL(10, 2) DEFAULT NULL,
  validFrom DATE,
  validTo DATE,
  image TEXT,
  termsAndConditions TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  applicableCategories JSON,
  applicableProducts JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_isActive (isActive),
  INDEX idx_validFrom (validFrom),
  INDEX idx_validTo (validTo),
  INDEX idx_priority (priority)
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  rating INT DEFAULT 5,
  status VARCHAR(50) DEFAULT 'pending',
  response TEXT,
  respondedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_createdAt (createdAt)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  productId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_product (userId, productId),
  INDEX idx_userId (userId),
  INDEX idx_productId (productId)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- 'info', 'order', 'promotion', 'system', 'payment'
  isRead BOOLEAN DEFAULT FALSE,
  link VARCHAR(255),
  image TEXT,
  data JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  readAt TIMESTAMP NULL,
  INDEX idx_userId (userId),
  INDEX idx_isRead (isRead),
  INDEX idx_type (type),
  INDEX idx_createdAt (createdAt)
);

-- Business License, GST Info, and Credit Limit are stored in kyc_profiles as JSON columns

-- Insert dummy products
INSERT IGNORE INTO products (name, category, price, retailPrice, moq, unit, packSize, pricePerPack, stockQuantity, hsnCode, gstRate, supplier, supplierCode, image, description, volumeDiscounts, discount, isTrending) VALUES
('Paracetamol 500mg Tablets', 'Pain Relief', 45.00, 60.00, 100, 'tablets', 10, 450.00, 5000, '30049099', 12.00, 'MediCorp Pharmaceuticals', 'MC001', 'https://via.placeholder.com/300x300', 'Fast-acting pain relief and fever reducer. Suitable for adults and children above 12 years.', '[{"minQty": 500, "discount": 5}, {"minQty": 1000, "discount": 10}]', 15.00, TRUE),
('Amoxicillin 250mg Capsules', 'Antibiotics', 120.00, 180.00, 50, 'capsules', 10, 1200.00, 3000, '30041090', 12.00, 'HealthCare Pharma', 'HP002', 'https://via.placeholder.com/300x300', 'Broad-spectrum antibiotic for bacterial infections. Prescription required.', '[{"minQty": 200, "discount": 8}, {"minQty": 500, "discount": 15}]', 20.00, TRUE),
('Cetirizine 10mg Tablets', 'Allergy Relief', 35.00, 50.00, 100, 'tablets', 10, 350.00, 8000, '30049099', 12.00, 'AllerMed Solutions', 'AM003', 'https://via.placeholder.com/300x300', 'Effective antihistamine for allergy symptoms, hay fever, and skin reactions.', '[{"minQty": 500, "discount": 10}, {"minQty": 1000, "discount": 18}]', 25.00, TRUE),
('Omeprazole 20mg Capsules', 'Digestive Health', 95.00, 140.00, 30, 'capsules', 14, 1330.00, 4000, '30049099', 12.00, 'DigestCare Pharma', 'DC004', 'https://via.placeholder.com/300x300', 'Proton pump inhibitor for acid reflux, heartburn, and stomach ulcers.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 20}]', 18.00, TRUE),
('Ibuprofen 400mg Tablets', 'Pain Relief', 55.00, 75.00, 100, 'tablets', 10, 550.00, 6000, '30049099', 12.00, 'PainFree Pharmaceuticals', 'PF005', 'https://via.placeholder.com/300x300', 'Anti-inflammatory pain reliever for headaches, muscle pain, and arthritis.', '[{"minQty": 500, "discount": 8}, {"minQty": 1000, "discount": 15}]', 12.00, TRUE),
('Azithromycin 500mg Tablets', 'Antibiotics', 150.00, 220.00, 30, 'tablets', 3, 450.00, 2500, '30042090', 12.00, 'BioMed Solutions', 'BM006', 'https://via.placeholder.com/300x300', 'Macrolide antibiotic for respiratory and skin infections. Prescription required.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 22.00, TRUE),
('Loratadine 10mg Tablets', 'Allergy Relief', 40.00, 55.00, 100, 'tablets', 10, 400.00, 7000, '30049099', 12.00, 'AllerMed Solutions', 'AM007', 'https://via.placeholder.com/300x300', 'Non-drowsy antihistamine for seasonal allergies and hives.', '[{"minQty": 500, "discount": 10}, {"minQty": 1000, "discount": 20}]', 15.00, FALSE),
('Pantoprazole 40mg Tablets', 'Digestive Health', 110.00, 160.00, 30, 'tablets', 14, 1540.00, 3500, '30049099', 12.00, 'DigestCare Pharma', 'DC008', 'https://via.placeholder.com/300x300', 'PPI for treating GERD and preventing stomach ulcers.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 22}]', 20.00, FALSE),
('Diclofenac 50mg Tablets', 'Pain Relief', 50.00, 70.00, 100, 'tablets', 10, 500.00, 5500, '30049099', 12.00, 'PainFree Pharmaceuticals', 'PF009', 'https://via.placeholder.com/300x300', 'NSAID for reducing inflammation and pain in joints and muscles.', '[{"minQty": 500, "discount": 8}, {"minQty": 1000, "discount": 15}]', 10.00, FALSE),
('Ciprofloxacin 500mg Tablets', 'Antibiotics', 130.00, 190.00, 30, 'tablets', 10, 1300.00, 2800, '30042090', 12.00, 'HealthCare Pharma', 'HP010', 'https://via.placeholder.com/300x300', 'Fluoroquinolone antibiotic for urinary tract and respiratory infections.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 18.00, FALSE),
('Montelukast 10mg Tablets', 'Respiratory', 85.00, 120.00, 30, 'tablets', 10, 850.00, 3200, '30049099', 12.00, 'RespiraMed Pharma', 'RM011', 'https://via.placeholder.com/300x300', 'Leukotriene receptor antagonist for asthma and allergy management.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 20}]', 15.00, TRUE),
('Ranitidine 150mg Tablets', 'Digestive Health', 25.00, 35.00, 100, 'tablets', 10, 250.00, 9000, '30049099', 12.00, 'DigestCare Pharma', 'DC012', 'https://via.placeholder.com/300x300', 'H2 blocker for reducing stomach acid and treating ulcers.', '[{"minQty": 500, "discount": 15}, {"minQty": 1000, "discount": 25}]', 20.00, FALSE),
('Levothyroxine 50mcg Tablets', 'Hormones', 45.00, 65.00, 30, 'tablets', 30, 1350.00, 2000, '30043990', 12.00, 'HormoneCare Pharma', 'HC013', 'https://via.placeholder.com/300x300', 'Thyroid hormone replacement therapy. Prescription required.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 12.00, FALSE),
('Metformin 500mg Tablets', 'Diabetes', 30.00, 45.00, 100, 'tablets', 10, 300.00, 10000, '30049099', 12.00, 'DiabCare Solutions', 'DS014', 'https://via.placeholder.com/300x300', 'First-line medication for type 2 diabetes management.', '[{"minQty": 500, "discount": 12}, {"minQty": 1000, "discount": 22}]', 18.00, TRUE),
('Atorvastatin 10mg Tablets', 'Cardiovascular', 75.00, 110.00, 30, 'tablets', 10, 750.00, 3800, '30049099', 12.00, 'CardioMed Pharma', 'CM015', 'https://via.placeholder.com/300x300', 'Statin medication for lowering cholesterol levels.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 15.00, TRUE),
('Amlodipine 5mg Tablets', 'Cardiovascular', 40.00, 60.00, 30, 'tablets', 10, 400.00, 4500, '30049099', 12.00, 'CardioMed Pharma', 'CM016', 'https://via.placeholder.com/300x300', 'Calcium channel blocker for hypertension and angina.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 20}]', 12.00, FALSE),
('Losartan 50mg Tablets', 'Cardiovascular', 55.00, 80.00, 30, 'tablets', 10, 550.00, 4000, '30049099', 12.00, 'CardioMed Pharma', 'CM017', 'https://via.placeholder.com/300x300', 'ARB medication for treating high blood pressure.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 14.00, FALSE),
('Sertraline 50mg Tablets', 'Mental Health', 90.00, 130.00, 30, 'tablets', 10, 900.00, 1800, '30049099', 12.00, 'NeuroCare Pharma', 'NC018', 'https://via.placeholder.com/300x300', 'SSRI antidepressant for depression and anxiety disorders.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 20}]', 16.00, FALSE),
('Salbutamol Inhaler 100mcg', 'Respiratory', 120.00, 180.00, 1, 'inhaler', 1, 120.00, 2500, '30049099', 12.00, 'RespiraMed Pharma', 'RM019', 'https://via.placeholder.com/300x300', 'Bronchodilator inhaler for quick relief from asthma symptoms.', '[{"minQty": 10, "discount": 8}, {"minQty": 50, "discount": 15}]', 20.00, TRUE),
('Budesonide Inhaler 200mcg', 'Respiratory', 280.00, 400.00, 1, 'inhaler', 1, 280.00, 1500, '30049099', 12.00, 'RespiraMed Pharma', 'RM020', 'https://via.placeholder.com/300x300', 'Corticosteroid inhaler for long-term asthma control.', '[{"minQty": 10, "discount": 10}, {"minQty": 50, "discount": 18}]', 18.00, FALSE);

