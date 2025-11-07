# PowerShell script to setup database using XAMPP MySQL
# This script uses XAMPP's MySQL directly (no Apache needed)

Write-Host "XAMPP MySQL Database Setup" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Green

# XAMPP MySQL path
$xamppPath = "C:\xampp\mysql\bin\mysql.exe"

# Check if XAMPP MySQL exists
if (-not (Test-Path $xamppPath)) {
    Write-Host "`nERROR: XAMPP MySQL not found at: $xamppPath" -ForegroundColor Red
    Write-Host "`nPlease check:" -ForegroundColor Yellow
    Write-Host "1. XAMPP is installed" -ForegroundColor Cyan
    Write-Host "2. MySQL is started in XAMPP Control Panel" -ForegroundColor Cyan
    Write-Host "3. XAMPP is installed in C:\xampp" -ForegroundColor Cyan
    Write-Host "`nIf XAMPP is in a different location, update the path in this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nXAMPP MySQL found!" -ForegroundColor Green
Write-Host "Location: $xamppPath" -ForegroundColor Gray

# Check if MySQL is running
Write-Host "`nChecking if MySQL is running..." -ForegroundColor Yellow
$mysqlProcess = Get-Process -Name mysqld -ErrorAction SilentlyContinue
if (-not $mysqlProcess) {
    Write-Host "WARNING: MySQL process not found!" -ForegroundColor Yellow
    Write-Host "Please start MySQL in XAMPP Control Panel first." -ForegroundColor Yellow
    Write-Host "Press any key after starting MySQL..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Database name
$dbName = "retailer_pro"
$schemaFile = Join-Path $PSScriptRoot "schema.sql"

# Check if schema file exists
if (-not (Test-Path $schemaFile)) {
    Write-Host "`nERROR: schema.sql not found at: $schemaFile" -ForegroundColor Red
    exit 1
}

# Create database
Write-Host "`nCreating database '$dbName'..." -ForegroundColor Yellow
try {
    & $xamppPath -u root -e "CREATE DATABASE IF NOT EXISTS $dbName;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database created successfully!" -ForegroundColor Green
    } else {
        throw "Failed to create database"
    }
} catch {
    Write-Host "Error creating database: $_" -ForegroundColor Red
    Write-Host "Make sure MySQL is running in XAMPP Control Panel" -ForegroundColor Yellow
    exit 1
}

# Run schema
Write-Host "`nRunning schema.sql..." -ForegroundColor Yellow
try {
    Get-Content $schemaFile | & $xamppPath -u root $dbName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSchema executed successfully!" -ForegroundColor Green
    } else {
        throw "Failed to run schema"
    }
} catch {
    Write-Host "Error running schema: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Database setup complete!" -ForegroundColor Green
Write-Host "Database '$dbName' is ready to use." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

