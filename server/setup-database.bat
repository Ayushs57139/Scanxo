@echo off
REM Batch script to setup MySQL database for Windows
REM Run this script from the server directory

echo Setting up MySQL database...

REM Read MySQL password
set /p MYSQL_PASSWORD="Enter MySQL root password (press Enter if no password): "

REM Database name
set DB_NAME=retailer_pro

REM Create database
echo Creating database...
if "%MYSQL_PASSWORD%"=="" (
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS %DB_NAME%;"
) else (
    mysql -u root -p%MYSQL_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME%;"
)

REM Run schema file
echo Running schema.sql...
if "%MYSQL_PASSWORD%"=="" (
    mysql -u root %DB_NAME% < schema.sql
) else (
    mysql -u root -p%MYSQL_PASSWORD% %DB_NAME% < schema.sql
)

echo Database setup complete!
pause

