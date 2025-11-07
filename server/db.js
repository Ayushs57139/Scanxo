import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables from .env file if available
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'retailer_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool without database first to create it if needed
const poolWithoutDb = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create database if it doesn't exist
poolWithoutDb.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`)
  .then(() => {
    console.log(`Database '${dbConfig.database}' ready`);
  })
  .catch(err => {
    console.warn('Could not create database:', err.message);
  });

// Create connection pool with database
const pool = mysql.createPool(dbConfig);

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('Connected to MySQL database');
    connection.release();
  })
  .catch(err => {
    console.warn('MySQL not connected. Please start MySQL in XAMPP Control Panel.');
  });

export default pool;

