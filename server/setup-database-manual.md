# Manual Database Setup (Alternative Method)

If you can't use the command line, follow these steps:

## Using MySQL Workbench

1. **Open MySQL Workbench**
2. **Connect to your MySQL server** (click on a connection or create a new one)
3. **Create the database:**
   ```sql
   CREATE DATABASE retailer_pro;
   ```
4. **Select the database:**
   ```sql
   USE retailer_pro;
   ```
5. **Open `schema.sql` file** in a text editor
6. **Copy all the SQL commands** from `schema.sql`
7. **Paste into MySQL Workbench** SQL editor
8. **Click Execute** (or press Ctrl+Enter)

## Using phpMyAdmin (XAMPP/WAMP)

1. **Start XAMPP/WAMP** and ensure MySQL is running
2. **Open phpMyAdmin** in browser: http://localhost/phpmyadmin
3. **Click "New"** in the left sidebar
4. **Enter database name:** `retailer_pro`
5. **Click "Create"**
6. **Select the database** from left sidebar
7. **Click "Import"** tab
8. **Choose file:** Select `server/schema.sql`
9. **Click "Go"** at the bottom

## Using Command Line (if MySQL is in PATH)

```powershell
# Navigate to server directory
cd C:\Users\Ayush\Desktop\Scanexooooo\server

# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS retailer_pro;"

# Run schema
Get-Content schema.sql | mysql -u root -p retailer_pro
```

## Verify Setup

After setup, verify tables were created:

```sql
USE retailer_pro;
SHOW TABLES;
```

You should see:
- products
- categories
- banners
- orders
- retailers
- settings
- kyc_profiles
- kyc_documents
- kyc_verifications

