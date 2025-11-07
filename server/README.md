# Scanxo API Server

Express.js API server with MySQL database.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Make sure MySQL is installed and running
2. Create the database and tables:

**Windows PowerShell:**
```powershell
# Option 1: Use the setup script
.\setup-database.ps1

# Option 2: Manual commands
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS retailer_pro;"
Get-Content schema.sql | mysql -u root -p retailer_pro
```

**Windows CMD:**
```cmd
# Option 1: Use the batch file
setup-database.bat

# Option 2: Manual commands
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS retailer_pro;"
mysql -u root -p retailer_pro < schema.sql
```

**Linux/Mac:**
```bash
mysql -u root -p < schema.sql
```

**Manual SQL:**
```sql
mysql -u root -p
CREATE DATABASE retailer_pro;
USE retailer_pro;
SOURCE schema.sql;
```

### 3. Environment Configuration

Create a `.env` file in the server directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=retailer_pro
PORT=4000
```

### 4. Run the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:4000`

## Database Schema

The database includes the following tables:
- `products` - Product catalog
- `categories` - Product categories
- `banners` - Promotional banners
- `orders` - Customer orders
- `retailers` - Retailer information
- `settings` - Application settings
- `kyc_profiles` - KYC user profiles
- `kyc_documents` - KYC uploaded documents
- `kyc_verifications` - KYC verification records

## API Endpoints

All endpoints are prefixed with `/api`:

- Products: `/api/products`
- Categories: `/api/categories`
- Banners: `/api/banners`
- Orders: `/api/orders`
- Retailers: `/api/retailers`
- KYC: `/api/kyc/*`

## File Uploads

Uploaded documents are stored in `server/uploads/documents/` and served at `/uploads/documents/`

