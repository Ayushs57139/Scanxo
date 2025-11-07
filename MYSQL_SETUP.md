# MySQL Database Setup

This project now uses **MySQL database only** - no localStorage or AsyncStorage fallbacks.

## Setup Instructions

### 1. Install MySQL

Make sure MySQL is installed and running on your system.

### 2. Create Database

#### Option 1: Using PowerShell Script (Recommended for Windows)

```powershell
cd server
.\setup-database.ps1
```

#### Option 2: Using Batch File (Windows)

```cmd
cd server
setup-database.bat
```

#### Option 3: Using PowerShell Commands Directly

```powershell
cd server
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS retailer_pro;"

# Run schema (replace 'your_password' with your MySQL password or leave empty if no password)
Get-Content schema.sql | mysql -u root -p retailer_pro
```

#### Option 4: Using Command Prompt (CMD)

```cmd
cd server
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS retailer_pro;"
mysql -u root -p retailer_pro < schema.sql
```

#### Option 5: Manual SQL Commands

```sql
mysql -u root -p
CREATE DATABASE retailer_pro;
USE retailer_pro;
SOURCE schema.sql;
```

### 3. Configure Environment Variables

Create a `.env` file in the `server` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=retailer_pro

# Server Configuration
PORT=4000
```

**Important:** Update `DB_PASSWORD` with your actual MySQL root password.

### 4. Install Dependencies

```bash
# Server dependencies
cd server
npm install

# Admin panel dependencies
cd ../admin
npm install

# React Native app dependencies
cd ..
npm install
```

### 5. Start the Server

```bash
cd server
npm start
```

The server will run on `http://localhost:4000` and connect to MySQL.

### 6. Start Admin Panel

```bash
cd admin
npm run dev
```

Admin panel will run on `http://localhost:3001` (or the port configured in vite.config.js)

### 7. Start React Native App

```bash
npm start
```

## Database Tables

The following tables are created:

- `products` - Product catalog
- `categories` - Product categories
- `banners` - Promotional banners
- `orders` - Customer orders
- `retailers` - Retailer information
- `settings` - Application settings
- `kyc_profiles` - KYC user profiles
- `kyc_documents` - KYC uploaded documents
- `kyc_verifications` - KYC verification records

## Important Notes

1. **No Fallbacks**: All API calls now use MySQL only. There are no localStorage or AsyncStorage fallbacks.

2. **Environment Variables**: Make sure the `.env` file in the `server` directory is properly configured.

3. **Database Connection**: The server will automatically connect to MySQL on startup. Check the console for connection status.

4. **API Base URL**: 
   - Admin panel: Uses `VITE_API_BASE_URL` environment variable or defaults to `http://localhost:4000/api`
   - React Native app: Configured in `src/constants/config.js`

5. **File Uploads**: Document uploads are stored in `server/uploads/documents/` and served at `/uploads/documents/`

## Troubleshooting

### Connection Error
If you see "Error connecting to MySQL":
- Check MySQL is running: `mysql -u root -p`
- Verify database exists: `SHOW DATABASES;`
- Check `.env` file has correct credentials

### Port Already in Use
If port 4000 is in use:
- Change `PORT` in `server/.env`
- Update API base URL in admin panel and React Native app

### Tables Not Found
If tables don't exist:
- Run `schema.sql` again: `mysql -u root -p retailer_pro < schema.sql`

