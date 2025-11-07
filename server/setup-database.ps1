# PowerShell script to setup MySQL database
# Run this script from the server directory

Write-Host "Setting up MySQL database..." -ForegroundColor Green

# Check if MySQL is installed
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlPath) {
    Write-Host "`nERROR: MySQL command not found!" -ForegroundColor Red
    Write-Host "`nPlease do one of the following:" -ForegroundColor Yellow
    Write-Host "1. Install MySQL from https://dev.mysql.com/downloads/mysql/" -ForegroundColor Cyan
    Write-Host "2. Add MySQL to your PATH environment variable" -ForegroundColor Cyan
    Write-Host "   - Default location: C:\Program Files\MySQL\MySQL Server X.X\bin" -ForegroundColor Gray
    Write-Host "3. Use MySQL Workbench or phpMyAdmin to run the schema manually" -ForegroundColor Cyan
    Write-Host "`nTo add MySQL to PATH:" -ForegroundColor Yellow
    Write-Host "   [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';C:\Program Files\MySQL\MySQL Server X.X\bin', 'User')" -ForegroundColor Gray
    Write-Host "   (Replace X.X with your MySQL version, then restart PowerShell)" -ForegroundColor Gray
    exit 1
}

Write-Host "MySQL found at: $($mysqlPath.Source)" -ForegroundColor Green

# Read MySQL password
$password = Read-Host "Enter MySQL root password (press Enter if no password)"

# Database name
$dbName = "retailer_pro"

# Create database
Write-Host "`nCreating database..." -ForegroundColor Yellow
try {
    if ($password) {
        $env:MYSQL_PWD = $password
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS $dbName;" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create database"
        }
    } else {
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS $dbName;" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create database"
        }
    }
    Write-Host "Database created successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error creating database: $_" -ForegroundColor Red
    exit 1
}

# Run schema file
Write-Host "Running schema.sql..." -ForegroundColor Yellow
try {
    if ($password) {
        $env:MYSQL_PWD = $password
        Get-Content schema.sql | mysql -u root $dbName 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to run schema"
        }
    } else {
        Get-Content schema.sql | mysql -u root $dbName 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to run schema"
        }
    }
    Write-Host "Schema executed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error running schema: $_" -ForegroundColor Red
    Write-Host "`nYou can also run the schema manually:" -ForegroundColor Yellow
    Write-Host "1. Open MySQL Workbench or phpMyAdmin" -ForegroundColor Cyan
    Write-Host "2. Connect to your MySQL server" -ForegroundColor Cyan
    Write-Host "3. Create database: CREATE DATABASE retailer_pro;" -ForegroundColor Cyan
    Write-Host "4. Select database: USE retailer_pro;" -ForegroundColor Cyan
    Write-Host "5. Copy and paste the contents of schema.sql" -ForegroundColor Cyan
    exit 1
}

Write-Host "`nDatabase setup complete!" -ForegroundColor Green
Write-Host "Database '$dbName' is ready to use." -ForegroundColor Green

