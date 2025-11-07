# Fix: MySQL Server Has Gone Away Error

## Problem
phpMyAdmin shows: "MySQL server has gone away" (#2006)

This means MySQL service stopped or crashed.

## Solution 1: Restart MySQL in XAMPP

1. **Open XAMPP Control Panel**
2. **Stop MySQL** - Click "Stop" next to MySQL
3. **Wait 5 seconds**
4. **Start MySQL** - Click "Start" next to MySQL
5. **Wait for "Running" status** (green)
6. **Refresh phpMyAdmin** - Press F5 or click reload

## Solution 2: Use Command Line (More Reliable)

Instead of phpMyAdmin, use XAMPP's MySQL command line directly:

### Quick Setup Script:

```powershell
cd C:\Users\Ayush\Desktop\Scanexooooo\server
.\setup-xampp.ps1
```

This script uses MySQL directly and doesn't need phpMyAdmin.

### Manual Command Line:

```powershell
# Navigate to XAMPP MySQL
cd C:\xampp\mysql\bin

# Create database
.\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS retailer_pro;"

# Run schema
Get-Content "C:\Users\Ayush\Desktop\Scanexooooo\server\schema.sql" | .\mysql.exe -u root retailer_pro
```

## Solution 3: Check MySQL Configuration

If MySQL keeps crashing:

1. **Check XAMPP MySQL Logs:**
   - Open XAMPP Control Panel
   - Click "Logs" next to MySQL
   - Look for error messages

2. **Common Issues:**
   - Port 3306 already in use
   - MySQL service conflict
   - Insufficient memory

3. **Fix Port Conflict:**
   - Stop other MySQL services
   - Restart XAMPP
   - Try different port in XAMPP config

## Recommended: Use Command Line Script

The easiest way is to use the PowerShell script:

```powershell
cd C:\Users\Ayush\Desktop\Scanexooooo\server
.\setup-xampp.ps1
```

This bypasses phpMyAdmin completely and works directly with MySQL.

