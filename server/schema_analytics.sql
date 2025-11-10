-- Analytics Events table - for event ingestion pipeline
CREATE TABLE IF NOT EXISTS analytics_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  eventType VARCHAR(100) NOT NULL, -- 'order_created', 'order_completed', 'product_viewed', 'payment_received', etc.
  entityType VARCHAR(50), -- 'order', 'product', 'payment', 'user', etc.
  entityId INT,
  userId VARCHAR(100),
  properties JSON, -- Additional event properties
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_eventType (eventType),
  INDEX idx_entityType (entityType),
  INDEX idx_entityId (entityId),
  INDEX idx_userId (userId),
  INDEX idx_timestamp (timestamp)
);

-- Analytics Metrics Cache table - for pre-computed metrics
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metricType VARCHAR(100) NOT NULL, -- 'sales', 'inventory_turnover', 'pending_orders', 'aging_receivables', etc.
  metricKey VARCHAR(255) NOT NULL, -- Composite key for the metric (e.g., 'sales_daily_2024-01-15')
  metricValue DECIMAL(15, 2),
  metricData JSON, -- Additional metric data
  periodStart DATE,
  periodEnd DATE,
  computedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_metric (metricType, metricKey),
  INDEX idx_metricType (metricType),
  INDEX idx_periodStart (periodStart),
  INDEX idx_periodEnd (periodEnd),
  INDEX idx_computedAt (computedAt)
);

-- Analytics Dashboard Config table
CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSON NOT NULL, -- Dashboard configuration (widgets, layout, etc.)
  isDefault BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_isDefault (isDefault)
);

-- Insert default dashboards
INSERT IGNORE INTO analytics_dashboards (name, description, config, isDefault) VALUES
('Sales Dashboard', 'Overview of sales performance', '{"widgets": ["sales_overview", "sales_trend", "top_products", "sales_by_category"]}', TRUE),
('Inventory Dashboard', 'Inventory turnover and stock levels', '{"widgets": ["inventory_turnover", "stock_levels", "low_stock_alerts", "inventory_value"]}', FALSE),
('Orders Dashboard', 'Pending and completed orders analysis', '{"widgets": ["pending_orders", "order_status", "order_trend", "average_order_value"]}', FALSE),
('Receivables Dashboard', 'Aging receivables and payment tracking', '{"widgets": ["aging_receivables", "payment_status", "collection_trend", "outstanding_summary"]}', FALSE);

