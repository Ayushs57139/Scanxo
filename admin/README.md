# Scanxo Admin Panel

Web-based admin panel for managing the Scanxo mobile application.

## Features

- **Dashboard**: Overview statistics and recent orders
- **Product Management**: Full CRUD operations for products
- **Category Management**: Manage product categories
- **Banner Management**: Create and manage promotional banners
- **Order Management**: View and update order statuses
- **Retailer Management**: View registered retailers
- **Settings**: Platform configuration

## Installation

1. Navigate to the admin directory:
```bash
cd admin
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3001`

## Default Login Credentials

- **Email**: admin@scanxo.com
- **Password**: admin123

## Data Storage

The admin panel uses localStorage to simulate a backend API. All data is shared with the mobile app through the same localStorage keys, making the system fully interconnected.

## Tech Stack

- React 18
- React Router DOM
- Tailwind CSS
- Heroicons
- Vite

## API Structure

The admin panel uses a shared API service (`src/services/api.js`) that:
- Stores data in localStorage (simulating a backend)
- Provides CRUD operations for all entities
- Automatically syncs with the mobile app

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

