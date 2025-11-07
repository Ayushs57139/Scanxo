import pool from './db.js';

async function updateProductImages() {
  try {
    const [result] = await pool.execute(
      'UPDATE products SET image = ? WHERE id <= 20',
      ['https://via.placeholder.com/300x300']
    );
    console.log(`Updated ${result.affectedRows} product images`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating product images:', error);
    process.exit(1);
  }
}

updateProductImages();

