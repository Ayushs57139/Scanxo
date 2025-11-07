# Fix: phpMyAdmin Connection Refused

## Problem
You're seeing `ERR_CONNECTION_REFUSED` when trying to access phpMyAdmin.

## Solution: Start Apache in XAMPP

phpMyAdmin requires **both Apache and MySQL** to be running.

### Steps:

1. **Open XAMPP Control Panel**
2. **Start Apache** - Click "Start" next to Apache
3. **Start MySQL** - Click "Start" next to MySQL (if not already running)
4. **Wait for both to show "Running"** (green background)

### Then try again:
- http://localhost/phpmyadmin
- OR click "Admin" button next to MySQL in XAMPP

## Alternative: Use MySQL Command Line (No Apache Needed)

If you prefer not to use phpMyAdmin, you can use MySQL command line directly.

### Find MySQL in XAMPP:

XAMPP MySQL is usually located at:
- `C:\xampp\mysql\bin\mysql.exe`

### Setup Database via Command Line:

```powershell
# Navigate to XAMPP MySQL bin folder
cd C:\xampp\mysql\bin

# Create database
.\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS retailer_pro;"

# Run schema
Get-Content "C:\Users\Ayush\Desktop\Scanexooooo\server\schema.sql" | .\mysql.exe -u root retailer_pro
```

## Alternative: Use MySQL Workbench

1. Download MySQL Workbench: https://dev.mysql.com/downloads/workbench/
2. Create new connection:
   - Host: `localhost`
   - Port: `3306`
   - Username: `root`
   - Password: (leave empty for XAMPP)
3. Connect and run the SQL commands from `schema.sql`

