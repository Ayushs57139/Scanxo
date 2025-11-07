# MySQL Installation Guide for Windows

## Problem: "mysql is not recognized"

If you see this error, MySQL is either not installed or not in your PATH.

## Solution 1: Install MySQL

1. Download MySQL from: https://dev.mysql.com/downloads/mysql/
2. Run the installer
3. During installation, make sure to:
   - Add MySQL to PATH (check the option)
   - Remember your root password
4. Restart PowerShell after installation

## Solution 2: Add MySQL to PATH (if already installed)

### Find MySQL Installation Path

Common locations:
- `C:\Program Files\MySQL\MySQL Server 8.0\bin`
- `C:\Program Files\MySQL\MySQL Server 8.4\bin`
- `C:\xampp\mysql\bin` (if using XAMPP)
- `C:\wamp64\bin\mysql\mysql8.x.x\bin` (if using WAMP)

### Add to PATH using PowerShell

```powershell
# Replace X.X with your MySQL version (e.g., 8.0, 8.4)
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Add to user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$currentPath;$mysqlPath", "User")

# Verify
Write-Host "MySQL added to PATH. Please restart PowerShell."
```

### Add to PATH using GUI

1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", select "Path" and click "Edit"
5. Click "New" and add: `C:\Program Files\MySQL\MySQL Server 8.0\bin`
6. Click "OK" on all dialogs
7. **Restart PowerShell**

### Verify Installation

After restarting PowerShell:

```powershell
mysql --version
```

You should see the MySQL version number.

## Solution 3: Use MySQL Workbench (No Command Line Needed)

1. Download MySQL Workbench: https://dev.mysql.com/downloads/workbench/
2. Install and open MySQL Workbench
3. Connect to your MySQL server
4. Open `server/schema.sql` in Workbench
5. Execute the SQL script

## Solution 4: Use XAMPP/WAMP (Easier for Beginners)

### XAMPP
1. Download XAMPP: https://www.apachefriends.org/
2. Install XAMPP
3. Start MySQL from XAMPP Control Panel
4. Use phpMyAdmin (http://localhost/phpmyadmin) to:
   - Create database: `retailer_pro`
   - Import `server/schema.sql`

### WAMP
1. Download WAMP: https://www.wampserver.com/
2. Install WAMP
3. Start MySQL from WAMP menu
4. Use phpMyAdmin (http://localhost/phpmyadmin) to:
   - Create database: `retailer_pro`
   - Import `server/schema.sql`

## Quick Test

After installation, test MySQL:

```powershell
# Test connection
mysql -u root -p

# If it works, you'll be prompted for password
# Type: exit to quit
```

## Alternative: Manual Database Setup

If you can't get MySQL command line working, use MySQL Workbench or phpMyAdmin:

1. **Create database:**
   ```sql
   CREATE DATABASE retailer_pro;
   ```

2. **Select database:**
   ```sql
   USE retailer_pro;
   ```

3. **Copy and paste the contents of `server/schema.sql`** into the SQL editor and execute.

## Need Help?

- Check if MySQL service is running: `Get-Service | Where-Object {$_.Name -like "*mysql*"}`
- Check MySQL installation: Look in `C:\Program Files\MySQL\`
- Try using full path: `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p`

