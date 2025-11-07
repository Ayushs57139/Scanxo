# XAMPP Quick Start Guide

## ✅ Step 1: Start MySQL in XAMPP

1. Open **XAMPP Control Panel**
2. Click **Start** button next to **MySQL**
3. Wait for status to show **Running** (green)

## ✅ Step 2: Create Database in phpMyAdmin

1. Click **Admin** button next to MySQL in XAMPP
   - OR open: http://localhost/phpmyadmin
2. Click **"New"** in left sidebar
3. Database name: `retailer_pro`
4. Click **"Create"**

## ✅ Step 3: Import Schema

1. Click on **`retailer_pro`** database (left sidebar)
2. Click **"Import"** tab (top menu)
3. Click **"Choose File"**
4. Select: `server/schema.sql`
5. Click **"Go"** button
6. Wait for success message ✅

## ✅ Step 4: Install Server Dependencies

Open PowerShell in the server directory:

```powershell
cd C:\Users\Ayush\Desktop\Scanexooooo\server
npm install
```

## ✅ Step 5: Start the Server

```powershell
npm start
```

You should see:
```
Connected to MySQL database
Retailer Pro API running on http://localhost:4000
```

## ✅ Step 6: Test the API

Open browser and go to:
- http://localhost:4000/api/products
- http://localhost:4000/api/categories

You should see empty arrays `[]` (which is correct - database is ready!)

## ✅ Step 7: Start Admin Panel

Open a new PowerShell window:

```powershell
cd C:\Users\Ayush\Desktop\Scanexooooo\admin
npm install
npm run dev
```

Admin panel will open at: http://localhost:5173 (or similar port)

## ✅ Step 8: Start React Native App

Open another PowerShell window:

```powershell
cd C:\Users\Ayush\Desktop\Scanexooooo
npm start
```

## 🎉 Done!

Your full stack is now running:
- ✅ MySQL Database (XAMPP)
- ✅ Express API Server (port 4000)
- ✅ Admin Panel (React)
- ✅ React Native App

## Important Notes

- **Keep XAMPP Control Panel open** - MySQL must stay running
- **Keep all PowerShell windows open** - Each service needs its terminal
- **Default XAMPP MySQL password is EMPTY** (already configured in .env)

## Troubleshooting

**MySQL won't start?**
- Port 3306 might be in use
- Stop other MySQL services
- Restart XAMPP

**Can't connect to database?**
- Make sure MySQL is running in XAMPP
- Check `.env` file exists in `server/` folder
- Verify database `retailer_pro` exists in phpMyAdmin

**API returns errors?**
- Check server console for error messages
- Verify MySQL is running
- Make sure database and tables exist

