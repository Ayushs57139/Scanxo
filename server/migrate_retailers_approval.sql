-- Migration script to add approval system to retailers table
-- Run this if you have an existing database

USE retailer_pro;

-- Add new columns if they don't exist
ALTER TABLE retailers 
ADD COLUMN IF NOT EXISTS password VARCHAR(255),
ADD COLUMN IF NOT EXISTS approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approvedBy VARCHAR(255),
ADD COLUMN IF NOT EXISTS approvedAt TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS rejectionReason TEXT;

-- Add unique constraints if they don't exist
ALTER TABLE retailers 
ADD UNIQUE INDEX IF NOT EXISTS idx_email_unique (email),
ADD UNIQUE INDEX IF NOT EXISTS idx_phone_unique (phone);

-- Add indexes if they don't exist
ALTER TABLE retailers 
ADD INDEX IF NOT EXISTS idx_approvalStatus (approvalStatus);

-- Set all existing retailers to approved status (optional - adjust as needed)
-- UPDATE retailers SET approvalStatus = 'approved' WHERE approvalStatus IS NULL;

