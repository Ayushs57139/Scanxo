-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  shipmentNumber VARCHAR(100) UNIQUE NOT NULL,
  logisticsPartner VARCHAR(50) NOT NULL, -- 'shadow', 'dhl', 'delhivery'
  trackingNumber VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'created', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'
  labelUrl TEXT,
  labelData JSON,
  originAddress JSON NOT NULL,
  destinationAddress JSON NOT NULL,
  weight DECIMAL(10, 2),
  dimensions JSON, -- {length, width, height}
  shippingCost DECIMAL(10, 2),
  estimatedDeliveryDate DATE,
  actualDeliveryDate DATE,
  notes TEXT,
  partnerApiResponse JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orderId (orderId),
  INDEX idx_shipmentNumber (shipmentNumber),
  INDEX idx_trackingNumber (trackingNumber),
  INDEX idx_status (status),
  INDEX idx_logisticsPartner (logisticsPartner),
  INDEX idx_createdAt (createdAt),
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

-- Shipment tracking history table
CREATE TABLE IF NOT EXISTS shipment_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shipmentId INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(50) DEFAULT 'system', -- 'system', 'partner_api', 'manual'
  metadata JSON,
  INDEX idx_shipmentId (shipmentId),
  INDEX idx_timestamp (timestamp),
  INDEX idx_status (status),
  FOREIGN KEY (shipmentId) REFERENCES shipments(id) ON DELETE CASCADE
);

-- Logistics partners configuration table
CREATE TABLE IF NOT EXISTS logistics_partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE, -- 'shadow', 'dhl', 'delhivery'
  displayName VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  apiEndpoint VARCHAR(500),
  apiKey VARCHAR(255),
  apiSecret VARCHAR(255),
  config JSON, -- Additional configuration like rate limits, webhooks, etc.
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_isActive (isActive)
);

-- Insert default logistics partners
INSERT IGNORE INTO logistics_partners (name, displayName, isActive, config) VALUES
('shadow', 'Shadow Logistics', TRUE, '{"baseUrl": "https://api.shadowlogistics.com", "webhookUrl": "", "autoTracking": true}'),
('dhl', 'DHL Express', FALSE, '{"baseUrl": "https://api.dhl.com", "webhookUrl": "", "autoTracking": true}'),
('delhivery', 'Delhivery', FALSE, '{"baseUrl": "https://api.delhivery.com", "webhookUrl": "", "autoTracking": true}');

