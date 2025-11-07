# XAMPP Setup Guide

## Step 1: Start MySQL in XAMPP

1. Open **XAMPP Control Panel**
2. Click **Start** next to **MySQL**
3. Wait until the status shows **Running** (green background)

## Step 2: Open phpMyAdmin

1. In XAMPP Control Panel, click **Admin** next to MySQL
   - OR open browser and go to: http://localhost/phpmyadmin

## Step 3: Create Database

1. In phpMyAdmin, click **"New"** in the left sidebar
2. Enter database name: `retailer_pro`
3. Select collation: `utf8mb4_general_ci` (optional)
4. Click **"Create"**

## Step 4: Import Schema

1. Click on **`retailer_pro`** database in the left sidebar (to select it)
2. Click the **"Import"** tab at the top
3. Click **"Choose File"** button
4. Navigate to: `C:\Users\Ayush\Desktop\Scanexooooo\server\schema.sql`
5. Select the file and click **"Open"**
6. Scroll down and click **"Go"** button
7. Wait for "Import has been successfully finished" message

## Step 5: Verify Tables

1. In phpMyAdmin, make sure `retailer_pro` is selected
2. You should see these tables:
   - products
   - categories
   - banners
   - orders
   - retailers
   - settings
   - kyc_profiles
   - kyc_documents
   - kyc_verifications

## Step 6: Configure .env File

1. Open `server/.env` file
2. Update with XAMPP MySQL settings:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=retailer_pro
PORT=4000
```

**Note:** XAMPP MySQL default password is empty (blank)

## Step 7: Install Server Dependencies

```powershell
cd C:\Users\Ayush\Desktop\Scanexooooo\server
npm install
```

## Step 8: Start the Server

```powershell
npm start
```

You should see:
```
Connected to MySQL database
Retailer Pro API running on http://localhost:4000
```

## Troubleshooting

### MySQL won't start
- Check if port 3306 is already in use
- Stop any other MySQL services
- Try restarting XAMPP

### Can't access phpMyAdmin
- Make sure Apache is also running in XAMPP
- Try: http://127.0.0.1/phpmyadmin

### Connection error in server
- Make sure MySQL is running in XAMPP
- Check `.env` file has correct settings
- Default XAMPP MySQL user: `root`, password: (empty)

