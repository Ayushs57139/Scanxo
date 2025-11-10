# Retailer Approval System Implementation

## Overview
This document describes the complete implementation of the retailer approval system where new retailer signups require admin approval before they can login to the app.

## Features Implemented

### 1. Database Schema Updates
- Added `password` field (hashed using bcrypt)
- Added `approvalStatus` field (ENUM: 'pending', 'approved', 'rejected')
- Added `approvedBy` field (stores admin email who approved/rejected)
- Added `approvedAt` field (timestamp of approval)
- Added `rejectionReason` field (optional reason for rejection)
- Added unique constraints on `email` and `phone`
- Added indexes for better query performance

**Migration Script**: `server/migrate_retailers_approval.sql`

### 2. Backend API Endpoints

#### Registration Endpoint
- **POST** `/api/retailers/register`
- Validates all required fields
- Checks for duplicate email/phone
- Hashes password using bcrypt
- Sets approvalStatus to 'pending'
- Returns success message with retailer data (without password)

#### Login Endpoint
- **POST** `/api/retailers/login`
- Validates phone and password
- Checks if account is approved
- Returns 403 error if account is pending or rejected
- Verifies password using bcrypt
- Returns token and retailer data on success

#### Admin Approval Endpoint
- **PUT** `/api/retailers/:id/approve`
- Accepts `action` ('approve' or 'reject')
- Requires `approvedBy` (admin email)
- For rejection, requires `rejectionReason`
- Updates approval status and timestamps
- Logs audit events

### 3. Mobile App Updates

#### RegisterScreen
- Connected to backend API
- Shows loading state during registration
- Displays success message with approval notice
- Handles errors gracefully

#### LoginScreen
- Connected to backend API
- Checks approval status before allowing login
- Shows specific error messages for pending/rejected accounts
- Stores token and user data on successful login

### 4. Admin Panel Updates

#### Retailers Page
- Shows approval status badges (Pending/Approved/Rejected)
- Filter tabs: All, Pending, Approved, Rejected
- Approve/Reject buttons for pending retailers
- Shows approval details (who approved, when, rejection reason)
- Delete functionality for all retailers

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

This will install `bcrypt` which is required for password hashing.

### 2. Run Database Migration
If you have an existing database, run the migration script:
```bash
mysql -u root -p retailer_pro < server/migrate_retailers_approval.sql
```

Or if starting fresh, the updated `schema.sql` already includes all the new fields.

### 3. Start the Server
```bash
cd server
npm start
```

### 4. Test the Flow

#### Registration Flow:
1. Open the mobile app
2. Navigate to Register screen
3. Fill in all retailer details
4. Submit registration
5. Account will be created with 'pending' status
6. User will see message about waiting for approval

#### Admin Approval Flow:
1. Login to admin panel (admin@scanxo.com / admin123)
2. Navigate to Retailers page
3. Filter by "Pending" to see new registrations
4. Click approve (✓) or reject (✗) button
5. If rejecting, provide a reason

#### Login Flow:
1. After admin approval, retailer can login
2. If account is pending, login will show error message
3. If account is rejected, login will show rejection message
4. Only approved accounts can login successfully

## API Endpoints Summary

### Registration
```javascript
POST /api/retailers/register
Body: {
  businessName, businessType, gstin, drugLicense,
  contactName, phone, email, address, city, state,
  pincode, password
}
Response: { success: true, message, retailer }
```

### Login
```javascript
POST /api/retailers/login
Body: { phone, password }
Response: { success: true, token, retailer }
Error (403): { error, approvalStatus, message }
```

### Admin Approval
```javascript
PUT /api/retailers/:id/approve
Body: { action: 'approve'|'reject', approvedBy, rejectionReason? }
Response: { success: true, message, retailer }
```

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt (10 salt rounds)
2. **Unique Constraints**: Email and phone must be unique
3. **Approval Check**: Login is blocked until admin approval
4. **Audit Logging**: All approval actions are logged in audit_events table

## Status Flow

```
Registration → pending → [Admin Approval] → approved → Login Allowed
                              ↓
                           rejected → Login Blocked
```

## Notes

- Passwords are never returned in API responses
- Approval status is checked on every login attempt
- Admin can see all retailers with their approval status
- Rejection requires a reason for transparency
- All timestamps are automatically managed by MySQL

## Troubleshooting

1. **Migration fails**: Make sure you're using MySQL 5.7+ which supports `IF NOT EXISTS` in ALTER TABLE
2. **bcrypt errors**: Ensure Node.js version is 12+ for bcrypt compatibility
3. **Login fails**: Check that the retailer account is approved in admin panel
4. **API errors**: Verify server is running on port 4000 and database connection is working

