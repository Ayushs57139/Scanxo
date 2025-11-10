import express from 'express';
import cors from 'cors';
import { ensureDir } from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcrypt';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'documents');
    await ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Generic helpers for MySQL
function listRoute(table) {
  return async (_req, res) => {
    try {
      const [rows] = await pool.execute(`SELECT * FROM ${table} ORDER BY id DESC`);
      
      // Parse JSON fields
      const jsonFields = ['volumeDiscounts', 'items', 'address', 'businessAddress', 'contactDetails', 'taxDetails'];
      const parsedRows = rows.map(row => {
        const item = { ...row };
        jsonFields.forEach(field => {
          if (item[field] && typeof item[field] === 'string') {
            try {
              item[field] = JSON.parse(item[field]);
            } catch (e) {
              // Not valid JSON, keep as is
            }
          }
        });
        // Convert MySQL boolean (0/1) to JavaScript boolean
        if (item.isTrending !== undefined) {
          item.isTrending = Boolean(item.isTrending);
        }
        return item;
      });
      
      res.json(parsedRows);
    } catch (error) {
      console.error(`Error fetching ${table}:`, error);
      res.status(500).json({ error: 'Database error' });
    }
  };
}

function getRoute(table) {
  return async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      
      const item = rows[0];
      // Parse JSON fields
      const jsonFields = ['volumeDiscounts', 'items', 'address', 'businessAddress', 'contactDetails', 'taxDetails'];
      jsonFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {
            // Not valid JSON, keep as is
          }
        }
      });
      // Convert MySQL boolean (0/1) to JavaScript boolean
      if (item.isTrending !== undefined) {
        item.isTrending = Boolean(item.isTrending);
      }
      
      res.json(item);
    } catch (error) {
      console.error(`Error fetching ${table}:`, error);
      res.status(500).json({ error: 'Database error' });
    }
  };
}

function createRoute(table) {
  return async (req, res) => {
    try {
      const data = req.body;
      const fields = Object.keys(data).filter(key => key !== 'id');
      
      // Handle JSON fields
      const jsonFields = ['volumeDiscounts', 'items', 'address', 'businessAddress', 'contactDetails', 'taxDetails'];
      const values = fields.map(field => {
        const value = data[field];
        if (jsonFields.includes(field) && typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      });
      
      const placeholders = fields.map(() => '?').join(', ');
      
      const [result] = await pool.execute(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
      
      const [newItem] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
      const item = newItem[0];
      
      // Parse JSON fields
      jsonFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {
            // Not valid JSON, keep as is
          }
        }
      });
      
      // Log audit event
      await logAuditEvent(req, 'CREATE', table, result.insertId.toString(), { created: item });
      
      res.status(201).json(item);
    } catch (error) {
      console.error(`Error creating ${table}:`, error);
      res.status(500).json({ error: 'Database error' });
    }
  };
}

function updateRoute(table) {
  return async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = req.body;
      delete data.id; // Don't update id
      
      const fields = Object.keys(data).filter(key => key !== 'id' && key !== 'createdAt');
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      // Handle JSON fields
      const jsonFields = ['volumeDiscounts', 'items', 'address', 'businessAddress', 'contactDetails', 'taxDetails'];
      const values = fields.map(field => {
        const value = data[field];
        if (jsonFields.includes(field) && typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      });
      
      values.push(id);
      
      await pool.execute(
        `UPDATE ${table} SET ${setClause} WHERE id = ?`,
        values
      );
      
      const [updated] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
      
      const item = updated[0];
      // Parse JSON fields
      jsonFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {
            // Not valid JSON, keep as is
          }
        }
      });
      
      // Log audit event
      await logAuditEvent(req, 'UPDATE', table, id.toString(), { updated: item });
      
      res.json(item);
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      res.status(500).json({ error: 'Database error' });
    }
  };
}

function deleteRoute(table) {
  return async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
      
      // Log audit event
      await logAuditEvent(req, 'DELETE', table, id.toString());
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting ${table}:`, error);
      res.status(500).json({ error: 'Database error' });
    }
  };
}

// Audit logging helper function
async function logAuditEvent(req, action, resource, resourceId = null, details = null) {
  try {
    // Extract user from request (could be from token, session, or header)
    const user = req.headers['x-user-id'] || req.body?.userId || req.query?.userId || req.user?.id || req.user?.email || 'system';
    
    // Extract IP address
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    // Extract user agent
    const userAgent = req.headers['user-agent'] || null;
    
    // Prepare details object
    const auditDetails = {
      ...details,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method === 'GET' ? null : (req.body ? JSON.stringify(req.body).substring(0, 1000) : null) // Limit body size
    };
    
    const detailsJson = auditDetails ? JSON.stringify(auditDetails) : null;
    
    await pool.execute(
      'INSERT INTO audit_events (user, action, resource, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user, action, resource, resourceId, detailsJson, ipAddress, userAgent]
    );
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Error logging audit event:', error);
  }
}

// Routes
const api = express.Router();

// Products
api.get('/products', listRoute('products'));
// Trending Products - must be before /products/:id route
api.get('/products/trending', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM products WHERE isTrending = TRUE OR discount > 0 ORDER BY discount DESC, createdAt DESC LIMIT 10`
    );
    
    // Parse JSON fields
    const jsonFields = ['volumeDiscounts'];
    const parsedRows = rows.map(row => {
      const item = { ...row };
      jsonFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {
            // Not valid JSON, keep as is
          }
        }
      });
      // Convert MySQL boolean (0/1) to JavaScript boolean
      if (item.isTrending !== undefined) {
        item.isTrending = Boolean(item.isTrending);
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/products/:id', getRoute('products'));
api.post('/products', async (req, res) => {
  try {
    const data = req.body;
    const fields = Object.keys(data).filter(key => key !== 'id');
    
    // Handle JSON fields
    const jsonFields = ['volumeDiscounts', 'items', 'address', 'businessAddress', 'contactDetails', 'taxDetails'];
    const values = fields.map(field => {
      const value = data[field];
      if (jsonFields.includes(field) && typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value;
    });
    
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO products (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute(`SELECT * FROM products WHERE id = ?`, [result.insertId]);
    const item = newItem[0];
    
    // Parse JSON fields
    jsonFields.forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    
    // Update search index
    await updateProductSearchIndex(result.insertId, item);
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.put('/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data).filter(key => key !== 'id' && key !== 'createdAt');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    // Handle JSON fields
    const jsonFields = ['volumeDiscounts', 'items', 'address', 'businessAddress', 'contactDetails', 'taxDetails'];
    const values = fields.map(field => {
      const value = data[field];
      if (jsonFields.includes(field) && typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value;
    });
    
    values.push(id);
    
    await pool.execute(
      `UPDATE products SET ${setClause} WHERE id = ?`,
      values
    );
    
    const [updated] = await pool.execute(`SELECT * FROM products WHERE id = ?`, [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const item = updated[0];
    // Parse JSON fields
    jsonFields.forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    
    // Update search index
    await updateProductSearchIndex(id, item);
    
    res.json(item);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.delete('/products/:id', deleteRoute('products'));

// Search index update function
async function updateProductSearchIndex(productId, product) {
  try {
    const searchText = [
      product.name || '',
      product.category || '',
      product.description || '',
      product.hsnCode || '',
      product.supplier || '',
      product.supplierCode || '',
      product.sku || ''
    ].filter(Boolean).join(' ').toLowerCase();
    
    const keywords = [
      product.name,
      product.category,
      product.hsnCode,
      product.supplier,
      product.sku
    ].filter(Boolean);
    
    await pool.execute(
      `INSERT INTO product_search_index (productId, searchText, keywords) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE searchText = ?, keywords = ?, updatedAt = CURRENT_TIMESTAMP`,
      [productId, searchText, JSON.stringify(keywords), searchText, JSON.stringify(keywords)]
    );
  } catch (error) {
    console.error('Error updating search index:', error);
  }
}

// Product SKUs
api.get('/products/:id/skus', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM product_skus WHERE productId = ? ORDER BY id DESC', [productId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/products/:id/skus', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const data = { ...req.body, productId };
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO product_skus (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM product_skus WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating SKU:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/products/skus/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE product_skus SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM product_skus WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating SKU:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/products/skus/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM product_skus WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting SKU:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Price Tiers
api.get('/products/:id/price-tiers', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM price_tiers WHERE productId = ? ORDER BY minQuantity ASC', [productId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching price tiers:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/products/:id/price-tiers', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const data = { ...req.body, productId };
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO price_tiers (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM price_tiers WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating price tier:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/products/price-tiers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE price_tiers SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM price_tiers WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating price tier:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/products/price-tiers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM price_tiers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting price tier:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Unit Conversions
api.get('/products/:id/unit-conversions', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM unit_conversions WHERE productId = ?', [productId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching unit conversions:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/products/:id/unit-conversions', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const data = { ...req.body, productId };
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO unit_conversions (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM unit_conversions WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating unit conversion:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/products/unit-conversions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE unit_conversions SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM unit_conversions WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating unit conversion:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/products/unit-conversions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM unit_conversions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting unit conversion:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Substitute Products
api.get('/products/:id/substitutes', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(
      `SELECT s.*, p.name as substituteProductName, p.image as substituteProductImage, p.price as substituteProductPrice
       FROM substitute_products s
       JOIN products p ON s.substituteProductId = p.id
       WHERE s.productId = ? ORDER BY s.priority ASC, s.id DESC`,
      [productId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching substitutes:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/products/:id/substitutes', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const data = { ...req.body, productId };
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO substitute_products (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute(
      `SELECT s.*, p.name as substituteProductName, p.image as substituteProductImage, p.price as substituteProductPrice
       FROM substitute_products s
       JOIN products p ON s.substituteProductId = p.id
       WHERE s.id = ?`,
      [result.insertId]
    );
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating substitute:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/products/substitutes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE substitute_products SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute(
      `SELECT s.*, p.name as substituteProductName, p.image as substituteProductImage, p.price as substituteProductPrice
       FROM substitute_products s
       JOIN products p ON s.substituteProductId = p.id
       WHERE s.id = ?`,
      [id]
    );
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating substitute:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/products/substitutes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM substitute_products WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting substitute:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Product Search
api.get('/products/search/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const searchPattern = `%${query}%`;
    const [rows] = await pool.execute(
      `SELECT DISTINCT p.* FROM products p
       LEFT JOIN product_search_index psi ON p.id = psi.productId
       WHERE (psi.searchText IS NOT NULL AND MATCH(psi.searchText) AGAINST(? IN NATURAL LANGUAGE MODE))
       OR p.name LIKE ? OR p.category LIKE ? OR p.hsnCode LIKE ? OR p.sku LIKE ?
       ORDER BY p.name ASC`,
      [query, searchPattern, searchPattern, searchPattern, searchPattern]
    );
    
    // Parse JSON fields
    const jsonFields = ['volumeDiscounts'];
    const parsedRows = rows.map(row => {
      const item = { ...row };
      jsonFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {}
        }
      });
      if (item.isTrending !== undefined) {
        item.isTrending = Boolean(item.isTrending);
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Product Bulk Import/Export
api.get('/products/export/csv', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY id DESC');
    
    // Convert to CSV
    const headers = ['id', 'name', 'category', 'price', 'retailPrice', 'moq', 'unit', 'packSize', 'pricePerPack', 'stockQuantity', 'hsnCode', 'gstRate', 'supplier', 'supplierCode', 'image', 'description', 'discount', 'isTrending', 'createdAt'];
    const csvRows = [headers.join(',')];
    
    rows.forEach(row => {
      const values = headers.map(header => {
        let value = row[header] || '';
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products-export.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/products/import/csv', async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) {
      return res.status(400).json({ error: 'CSV data is required' });
    }
    
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'Invalid CSV format' });
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const results = { success: 0, failed: 0, errors: [] };
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const product = {};
        
        headers.forEach((header, index) => {
          if (values[index] !== undefined) {
            product[header] = values[index];
          }
        });
        
        // Convert numeric fields
        if (product.price) product.price = parseFloat(product.price);
        if (product.retailPrice) product.retailPrice = parseFloat(product.retailPrice);
        if (product.moq) product.moq = parseInt(product.moq);
        if (product.packSize) product.packSize = parseInt(product.packSize);
        if (product.pricePerPack) product.pricePerPack = parseFloat(product.pricePerPack);
        if (product.stockQuantity) product.stockQuantity = parseInt(product.stockQuantity);
        if (product.gstRate) product.gstRate = parseFloat(product.gstRate);
        if (product.discount) product.discount = parseFloat(product.discount);
        if (product.isTrending) product.isTrending = product.isTrending === 'true' || product.isTrending === '1';
        
        delete product.id; // Don't import IDs
        delete product.createdAt;
        delete product.updatedAt;
        
        const fields = Object.keys(product).filter(key => key !== 'id');
        const fieldValues = fields.map(field => product[field]);
        const placeholders = fields.map(() => '?').join(', ');
        
        await pool.execute(
          `INSERT INTO products (${fields.join(', ')}) VALUES (${placeholders})`,
          fieldValues
        );
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ line: i + 1, error: error.message });
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Inventory Movements & Expiry Alerts
api.get('/inventory/movements', async (req, res) => {
  try {
    const { productId, warehouseId, startDate, endDate, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        sm.*,
        p.name as productName,
        p.sku as productSku,
        w.name as warehouseName
      FROM stock_movements sm
      LEFT JOIN products p ON sm.productId = p.id
      LEFT JOIN warehouses w ON sm.warehouseId = w.id
      WHERE 1=1
    `;
    const params = [];
    
    if (productId) {
      query += ' AND sm.productId = ?';
      params.push(productId);
    }
    if (warehouseId) {
      query += ' AND sm.warehouseId = ?';
      params.push(warehouseId);
    }
    if (startDate) {
      query += ' AND sm.movementDate >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND sm.movementDate <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY sm.movementDate DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/inventory/expiry-alerts', async (req, res) => {
  try {
    const { days = 30, warehouseId } = req.query;
    const daysInt = parseInt(days);
    
    let query = `
      SELECT 
        si.*,
        p.name as productName,
        p.sku as productSku,
        w.name as warehouseName,
        DATEDIFF(si.expiryDate, CURDATE()) as daysUntilExpiry
      FROM stock_inventory si
      LEFT JOIN products p ON si.productId = p.id
      LEFT JOIN warehouses w ON si.warehouseId = w.id
      WHERE si.expiryDate IS NOT NULL
        AND si.expiryDate <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND si.quantity > 0
    `;
    const params = [daysInt];
    
    if (warehouseId) {
      query += ' AND si.warehouseId = ?';
      params.push(warehouseId);
    }
    
    query += ' ORDER BY si.expiryDate ASC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching expiry alerts:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Order Returns & Credit Notes
api.get('/order-returns', async (req, res) => {
  try {
    const { orderId, returnStatus, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        or.*,
        co.orderNumber,
        co.userId,
        p.name as productName,
        p.sku as productSku,
        p.image as productImage
      FROM order_returns or
      LEFT JOIN customer_orders co ON or.orderId = co.id
      LEFT JOIN products p ON or.productId = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (orderId) {
      query += ' AND or.orderId = ?';
      params.push(orderId);
    }
    if (returnStatus) {
      query += ' AND or.returnStatus = ?';
      params.push(returnStatus);
    }
    if (startDate) {
      query += ' AND or.returnedAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND or.returnedAt <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY or.returnedAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching order returns:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/credit-notes', async (req, res) => {
  try {
    const { orderId, returnId, amount, reason, notes } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount are required' });
    }
    
    const creditNoteNumber = `CN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const [result] = await pool.execute(
      `INSERT INTO credit_notes (creditNoteNumber, orderId, returnId, amount, reason, notes, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [creditNoteNumber, orderId, returnId || null, parseFloat(amount), reason || null, notes || null]
    );
    
    const [newItem] = await pool.execute('SELECT * FROM credit_notes WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating credit note:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/credit-notes', async (req, res) => {
  try {
    const { orderId, status, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM credit_notes WHERE 1=1';
    const params = [];
    
    if (orderId) {
      query += ' AND orderId = ?';
      params.push(orderId);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (startDate) {
      query += ' AND createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND createdAt <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching credit notes:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Reconciliations
api.get('/reconciliations', async (req, res) => {
  try {
    const { gatewayId, reconciliationStatus, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        r.*,
        pg.name as gatewayName
      FROM reconciliations r
      LEFT JOIN payment_gateways pg ON r.gatewayId = pg.id
      WHERE 1=1
    `;
    const params = [];
    
    if (gatewayId) {
      query += ' AND r.gatewayId = ?';
      params.push(gatewayId);
    }
    if (reconciliationStatus) {
      query += ' AND r.reconciliationStatus = ?';
      params.push(reconciliationStatus);
    }
    if (startDate) {
      query += ' AND r.reconciliationDate >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND r.reconciliationDate <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY r.reconciliationDate DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching reconciliations:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Accounting Exports (Tally/Zoho)
api.get('/accounting-exports', async (req, res) => {
  try {
    const { exportType, exportStatus, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM accounting_exports WHERE 1=1';
    const params = [];
    
    if (exportType) {
      query += ' AND exportType = ?';
      params.push(exportType);
    }
    if (exportStatus) {
      query += ' AND exportStatus = ?';
      params.push(exportStatus);
    }
    if (startDate) {
      query += ' AND createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND createdAt <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.filters && typeof item.filters === 'string') {
        try {
          item.filters = JSON.parse(item.filters);
        } catch (e) {}
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching accounting exports:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/accounting-exports/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { format = 'csv' } = req.query;
    
    const [rows] = await pool.execute('SELECT * FROM accounting_exports WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }
    
    const exportData = rows[0];
    
    // Generate export file based on type and format
    // This is a simplified version - in production, you'd generate actual Tally/Zoho format files
    let content = '';
    let filename = '';
    let contentType = '';
    
    if (format === 'csv') {
      contentType = 'text/csv';
      filename = `${exportData.exportNumber}.csv`;
      // Generate CSV content based on exportType
      content = generateAccountingCSV(exportData);
    } else if (format === 'xml') {
      contentType = 'application/xml';
      filename = `${exportData.exportNumber}.xml`;
      content = generateAccountingXML(exportData);
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(content);
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

function generateAccountingCSV(exportData) {
  // Simplified CSV generation - in production, generate proper accounting format
  const headers = ['Date', 'Account', 'Debit', 'Credit', 'Description'];
  const rows = [headers.join(',')];
  // Add actual data rows based on exportData
  return rows.join('\n');
}

function generateAccountingXML(exportData) {
  // Simplified XML generation for Tally/Zoho
  return `<?xml version="1.0"?><export>${exportData.exportNumber}</export>`;
}

// GST Invoices & Compliance Reports
api.get('/invoices/gst', async (req, res) => {
  try {
    const { startDate, endDate, gstin, invoiceStatus } = req.query;
    
    let query = `
      SELECT 
        i.*,
        co.orderNumber,
        co.userId,
        r.gstin as retailerGstin,
        r.name as retailerName
      FROM invoices i
      LEFT JOIN customer_orders co ON i.orderId = co.id
      LEFT JOIN retailers r ON co.userId = r.id
      WHERE 1=1
    `;
    const params = [];
    
    if (startDate) {
      query += ' AND i.invoiceDate >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND i.invoiceDate <= ?';
      params.push(endDate);
    }
    if (gstin) {
      query += ' AND r.gstin = ?';
      params.push(gstin);
    }
    if (invoiceStatus) {
      query += ' AND i.invoiceStatus = ?';
      params.push(invoiceStatus);
    }
    
    query += ' ORDER BY i.invoiceDate DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.taxBreakdown && typeof item.taxBreakdown === 'string') {
        try {
          item.taxBreakdown = JSON.parse(item.taxBreakdown);
        } catch (e) {}
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching GST invoices:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/invoices/:id/gst-pdf', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    const [rows] = await pool.execute(`
      SELECT 
        i.*,
        co.orderNumber,
        co.userId,
        r.gstin as retailerGstin,
        r.name as retailerName,
        r.address as retailerAddress
      FROM invoices i
      LEFT JOIN customer_orders co ON i.orderId = co.id
      LEFT JOIN retailers r ON co.userId = r.id
      WHERE i.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // In production, generate actual PDF using a library like pdfkit or puppeteer
    // For now, return JSON data that can be used to generate PDF on frontend
    const invoice = rows[0];
    if (invoice.taxBreakdown && typeof invoice.taxBreakdown === 'string') {
      try {
        invoice.taxBreakdown = JSON.parse(invoice.taxBreakdown);
      } catch (e) {}
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice for PDF:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/reports/gst-summary', async (req, res) => {
  try {
    const { startDate, endDate, gstin } = req.query;
    
    let query = `
      SELECT 
        DATE(i.invoiceDate) as date,
        r.gstin,
        r.name as retailerName,
        SUM(i.amount) as totalAmount,
        SUM(JSON_EXTRACT(i.taxBreakdown, '$.cgst')) as totalCGST,
        SUM(JSON_EXTRACT(i.taxBreakdown, '$.sgst')) as totalSGST,
        SUM(JSON_EXTRACT(i.taxBreakdown, '$.igst')) as totalIGST,
        COUNT(*) as invoiceCount
      FROM invoices i
      LEFT JOIN customer_orders co ON i.orderId = co.id
      LEFT JOIN retailers r ON co.userId = r.id
      WHERE i.invoiceStatus = 'paid'
    `;
    const params = [];
    
    if (startDate) {
      query += ' AND i.invoiceDate >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND i.invoiceDate <= ?';
      params.push(endDate);
    }
    if (gstin) {
      query += ' AND r.gstin = ?';
      params.push(gstin);
    }
    
    query += ' GROUP BY DATE(i.invoiceDate), r.gstin, r.name ORDER BY date DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching GST summary:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Categories
api.get('/categories', listRoute('categories'));
api.post('/categories', createRoute('categories'));
api.put('/categories/:id', updateRoute('categories'));
api.delete('/categories/:id', deleteRoute('categories'));

// Banners
api.get('/banners', listRoute('banners'));
api.post('/banners', createRoute('banners'));
api.put('/banners/:id', updateRoute('banners'));
api.delete('/banners/:id', deleteRoute('banners'));

// Special Offers
api.get('/banners/special-offers', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM banners WHERE isSpecialOffer = TRUE ORDER BY createdAt DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching special offers:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Orders
api.get('/orders', listRoute('orders'));
api.get('/orders/:id', getRoute('orders'));
api.post('/orders', createRoute('orders'));
api.put('/orders/:id', updateRoute('orders'));
api.delete('/orders/:id', deleteRoute('orders'));

// Retailers
api.get('/retailers', listRoute('retailers'));
api.get('/retailers/:id', getRoute('retailers'));
api.put('/retailers/:id', updateRoute('retailers'));
api.delete('/retailers/:id', deleteRoute('retailers'));

// Retailer Registration (with password hashing and approval status)
api.post('/retailers/register', async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      gstin,
      drugLicense,
      contactName,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      password
    } = req.body;

    // Validation
    if (!businessName || !businessType || !gstin || !drugLicense || !contactName || !phone || !email || !address || !city || !state || !pincode || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (gstin.length !== 15) {
      return res.status(400).json({ error: 'GSTIN must be 15 characters' });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email or phone already exists
    const [existing] = await pool.execute(
      'SELECT id FROM retailers WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email or phone number already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Prepare address JSON
    const addressData = {
      street: address,
      city,
      state,
      pincode
    };

    // Insert retailer with pending approval status
    const [result] = await pool.execute(
      `INSERT INTO retailers (name, email, phone, password, storeName, storeType, gstin, drugLicense, address, approvalStatus) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        contactName,
        email,
        phone,
        hashedPassword,
        businessName,
        businessType,
        gstin,
        drugLicense,
        JSON.stringify(addressData)
      ]
    );

    // Fetch the created retailer (without password)
    const [newRetailer] = await pool.execute(
      'SELECT id, name, email, phone, storeName, storeType, gstin, drugLicense, address, approvalStatus, createdAt FROM retailers WHERE id = ?',
      [result.insertId]
    );

    const retailer = newRetailer[0];
    if (retailer.address) {
      retailer.address = JSON.parse(retailer.address);
    }

    // Log audit event
    await logAuditEvent(req, 'CREATE', 'retailers', result.insertId.toString(), { created: retailer });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending admin approval.',
      retailer
    });
  } catch (error) {
    console.error('Error registering retailer:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Retailer Login
api.post('/retailers/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find retailer by phone
    const [retailers] = await pool.execute(
      'SELECT id, name, email, phone, password, storeName, storeType, gstin, drugLicense, address, approvalStatus FROM retailers WHERE phone = ?',
      [phone]
    );

    if (retailers.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const retailer = retailers[0];

    // Check if account is approved
    if (retailer.approvalStatus !== 'approved') {
      return res.status(403).json({
        error: 'Account pending approval',
        approvalStatus: retailer.approvalStatus,
        message: retailer.approvalStatus === 'pending'
          ? 'Your account is pending admin approval. Please wait for approval.'
          : 'Your account has been rejected. Please contact support.'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, retailer.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    // Remove password from response
    delete retailer.password;

    // Parse address JSON
    if (retailer.address) {
      retailer.address = JSON.parse(retailer.address);
    }

    // Generate token (in production, use JWT)
    const token = `retailer_token_${retailer.id}_${Date.now()}`;

    // Log audit event
    await logAuditEvent(req, 'LOGIN', 'retailers', retailer.id.toString(), { phone });

    res.json({
      success: true,
      token,
      retailer
    });
  } catch (error) {
    console.error('Error logging in retailer:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Approve/Reject Retailer
api.put('/retailers/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvedBy, rejectionReason } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    const [retailers] = await pool.execute('SELECT * FROM retailers WHERE id = ?', [id]);
    if (retailers.length === 0) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    if (action === 'approve') {
      await pool.execute(
        'UPDATE retailers SET approvalStatus = ?, approvedBy = ?, approvedAt = NOW(), rejectionReason = NULL WHERE id = ?',
        ['approved', approvedBy || 'admin', id]
      );
    } else {
      if (!rejectionReason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }
      await pool.execute(
        'UPDATE retailers SET approvalStatus = ?, approvedBy = ?, approvedAt = NULL, rejectionReason = ? WHERE id = ?',
        ['rejected', approvedBy || 'admin', rejectionReason, id]
      );
    }

    const [updated] = await pool.execute(
      'SELECT id, name, email, phone, storeName, storeType, gstin, approvalStatus, approvedBy, approvedAt, rejectionReason FROM retailers WHERE id = ?',
      [id]
    );

    const retailer = updated[0];

    // Log audit event
    await logAuditEvent(req, action.toUpperCase(), 'retailers', id.toString(), {
      action,
      approvedBy: approvedBy || 'admin',
      rejectionReason: action === 'reject' ? rejectionReason : null
    });

    res.json({
      success: true,
      message: `Retailer ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      retailer
    });
  } catch (error) {
    console.error('Error updating retailer approval:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Distributors
api.get('/distributors', listRoute('distributors'));
api.get('/distributors/:id', getRoute('distributors'));
api.post('/distributors', createRoute('distributors'));
api.put('/distributors/:id', updateRoute('distributors'));
api.delete('/distributors/:id', deleteRoute('distributors'));

// Company Offers
api.get('/company-offers', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM company_offers WHERE isActive = TRUE ORDER BY priority DESC, createdAt DESC`
    );
    
    // Parse JSON fields
    const jsonFields = ['applicableCategories', 'applicableProducts'];
    const parsedRows = rows.map(row => {
      const item = { ...row };
      jsonFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {
            item[field] = [];
          }
        }
      });
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching company offers:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/company-offers/all', listRoute('company_offers'));
api.get('/company-offers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(`SELECT * FROM company_offers WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const item = rows[0];
    // Parse JSON fields
    const jsonFields = ['applicableCategories', 'applicableProducts'];
    jsonFields.forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {
          item[field] = [];
        }
      }
    });
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching company offer:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/company-offers', async (req, res) => {
  try {
    const data = req.body;
    const jsonFields = ['applicableCategories', 'applicableProducts'];
    
    // Stringify JSON fields
    const insertData = { ...data };
    jsonFields.forEach(field => {
      if (insertData[field] && typeof insertData[field] === 'object') {
        insertData[field] = JSON.stringify(insertData[field]);
      }
    });
    
    const fields = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO company_offers (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [rows] = await pool.execute('SELECT * FROM company_offers WHERE id = ?', [result.insertId]);
    const item = rows[0];
    
    // Parse JSON fields
    jsonFields.forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {
          item[field] = [];
        }
      }
    });
    
    res.json(item);
  } catch (error) {
    console.error('Error creating company offer:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/company-offers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const jsonFields = ['applicableCategories', 'applicableProducts'];
    
    // Stringify JSON fields
    const updateData = { ...data };
    jsonFields.forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'object') {
        updateData[field] = JSON.stringify(updateData[field]);
      }
    });
    
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    await pool.execute(
      `UPDATE company_offers SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    
    const [rows] = await pool.execute('SELECT * FROM company_offers WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const item = rows[0];
    
    // Parse JSON fields
    jsonFields.forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {
          item[field] = [];
        }
      }
    });
    
    res.json(item);
  } catch (error) {
    console.error('Error updating company offer:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/company-offers/:id', deleteRoute('company_offers'));

// KYC Profiles
api.get('/kyc/profiles', async (_req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM kyc_profiles ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching KYC profiles:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/kyc/profiles/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM kyc_profiles WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const profile = rows[0];
    // Parse JSON fields
    if (profile.address) profile.address = JSON.parse(profile.address);
    if (profile.businessLicense) profile.businessLicense = JSON.parse(profile.businessLicense);
    if (profile.gstInfo) profile.gstInfo = JSON.parse(profile.gstInfo);
    if (profile.creditLimit) profile.creditLimit = JSON.parse(profile.creditLimit);
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching KYC profile:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/kyc/profiles/user/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM kyc_profiles WHERE userId = ?', [req.params.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const profile = rows[0];
    // Parse JSON fields
    if (profile.address) profile.address = JSON.parse(profile.address);
    if (profile.businessLicense) profile.businessLicense = JSON.parse(profile.businessLicense);
    if (profile.gstInfo) profile.gstInfo = JSON.parse(profile.gstInfo);
    if (profile.creditLimit) profile.creditLimit = JSON.parse(profile.creditLimit);
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching KYC profile:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/kyc/profiles', async (req, res) => {
  try {
    const data = req.body;
    const address = data.address ? JSON.stringify(data.address) : null;
    const businessLicense = data.businessLicense ? JSON.stringify(data.businessLicense) : null;
    const gstInfo = data.gstInfo ? JSON.stringify(data.gstInfo) : null;
    const creditLimit = data.creditLimit ? JSON.stringify(data.creditLimit) : null;
    
    const [result] = await pool.execute(
      `INSERT INTO kyc_profiles (userId, firstName, lastName, email, phone, dateOfBirth, address, panNumber, aadhaarNumber, verificationStatus, businessLicense, gstInfo, creditLimit) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.userId, data.firstName, data.lastName, data.email, data.phone, data.dateOfBirth, address, 
       data.panNumber, data.aadhaarNumber, data.verificationStatus || 'pending', businessLicense, gstInfo, creditLimit]
    );
    
    const [newProfile] = await pool.execute('SELECT * FROM kyc_profiles WHERE id = ?', [result.insertId]);
    const profile = newProfile[0];
    if (profile.address) profile.address = JSON.parse(profile.address);
    if (profile.businessLicense) profile.businessLicense = JSON.parse(profile.businessLicense);
    if (profile.gstInfo) profile.gstInfo = JSON.parse(profile.gstInfo);
    if (profile.creditLimit) profile.creditLimit = JSON.parse(profile.creditLimit);
    
    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating KYC profile:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/kyc/profiles/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    
    const address = data.address ? JSON.stringify(data.address) : null;
    const businessLicense = data.businessLicense ? JSON.stringify(data.businessLicense) : null;
    const gstInfo = data.gstInfo ? JSON.stringify(data.gstInfo) : null;
    const creditLimit = data.creditLimit ? JSON.stringify(data.creditLimit) : null;
    
    await pool.execute(
      `UPDATE kyc_profiles SET 
        firstName = ?, lastName = ?, email = ?, phone = ?, dateOfBirth = ?, 
        address = ?, panNumber = ?, aadhaarNumber = ?, verificationStatus = ?, 
        verifiedAt = ?, verifiedBy = ?, verificationNote = ?,
        businessLicense = ?, gstInfo = ?, creditLimit = ?
       WHERE id = ?`,
      [data.firstName, data.lastName, data.email, data.phone, data.dateOfBirth, address,
       data.panNumber, data.aadhaarNumber, data.verificationStatus, data.verifiedAt, data.verifiedBy, data.verificationNote,
       businessLicense, gstInfo, creditLimit, id]
    );
    
    const [updated] = await pool.execute('SELECT * FROM kyc_profiles WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const profile = updated[0];
    if (profile.address) profile.address = JSON.parse(profile.address);
    if (profile.businessLicense) profile.businessLicense = JSON.parse(profile.businessLicense);
    if (profile.gstInfo) profile.gstInfo = JSON.parse(profile.gstInfo);
    if (profile.creditLimit) profile.creditLimit = JSON.parse(profile.creditLimit);
    
    res.json(profile);
  } catch (error) {
    console.error('Error updating KYC profile:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/kyc/profiles/:id', deleteRoute('kyc_profiles'));

// KYC Documents
api.get('/kyc/documents', async (req, res) => {
  try {
    const userId = req.query.userId;
    let query = 'SELECT * FROM kyc_documents';
    let params = [];
    
    if (userId) {
      query += ' WHERE userId = ?';
      params = [userId];
    }
    
    query += ' ORDER BY id DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/kyc/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM kyc_documents WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/kyc/documents', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files || [];
    const userId = req.body.userId;
    const documentType = req.body.documentType;
    
    const newDocuments = [];
    for (const file of files) {
      const [result] = await pool.execute(
        `INSERT INTO kyc_documents (userId, documentType, fileName, filePath, fileSize, mimeType, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, documentType, file.originalname, `/uploads/documents/${file.filename}`, file.size, file.mimetype, 'pending']
      );
      
      const [doc] = await pool.execute('SELECT * FROM kyc_documents WHERE id = ?', [result.insertId]);
      newDocuments.push(doc[0]);
    }
    
    res.status(201).json(newDocuments);
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ error: error.message });
  }
});

api.put('/kyc/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    
    await pool.execute(
      `UPDATE kyc_documents SET status = ?, verifiedAt = ?, verifiedBy = ? WHERE id = ?`,
      [data.status, data.verifiedAt, data.verifiedBy, id]
    );
    
    const [updated] = await pool.execute('SELECT * FROM kyc_documents WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/kyc/documents/:id', deleteRoute('kyc_documents'));

// KYC Verification Status
api.get('/kyc/verifications', async (req, res) => {
  try {
    const userId = req.query.userId;
    let query = 'SELECT * FROM kyc_verifications';
    let params = [];
    
    if (userId) {
      query += ' WHERE userId = ?';
      params = [userId];
    }
    
    query += ' ORDER BY id DESC';
    const [rows] = await pool.execute(query, params);
    
    // Parse JSON fields
    const verifications = rows.map(row => {
      if (row.verificationData) {
        row.verificationData = JSON.parse(row.verificationData);
      }
      return row;
    });
    
    res.json(verifications);
  } catch (error) {
    console.error('Error fetching verifications:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/kyc/verifications/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM kyc_verifications WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const verification = rows[0];
    if (verification.verificationData) {
      verification.verificationData = JSON.parse(verification.verificationData);
    }
    res.json(verification);
  } catch (error) {
    console.error('Error fetching verification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/kyc/verifications', async (req, res) => {
  try {
    const data = req.body;
    const verificationData = data.verificationData ? JSON.stringify(data.verificationData) : null;
    
    const [result] = await pool.execute(
      `INSERT INTO kyc_verifications (userId, provider, documentType, status, verificationData) 
       VALUES (?, ?, ?, ?, ?)`,
      [data.userId, data.provider, data.documentType, data.status, verificationData]
    );
    
    const [newVerification] = await pool.execute('SELECT * FROM kyc_verifications WHERE id = ?', [result.insertId]);
    const verification = newVerification[0];
    if (verification.verificationData) {
      verification.verificationData = JSON.parse(verification.verificationData);
    }
    res.status(201).json(verification);
  } catch (error) {
    console.error('Error creating verification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/kyc/verifications/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const verificationData = data.verificationData ? JSON.stringify(data.verificationData) : null;
    
    await pool.execute(
      `UPDATE kyc_verifications SET status = ?, verificationData = ? WHERE id = ?`,
      [data.status, verificationData, id]
    );
    
    // If status changed to approved/rejected, update profile
    if (data.status && ['approved', 'rejected'].includes(data.status)) {
      const [verification] = await pool.execute('SELECT * FROM kyc_verifications WHERE id = ?', [id]);
      if (verification.length > 0) {
        await pool.execute(
          `UPDATE kyc_profiles SET verificationStatus = ?, verifiedAt = ?, verifiedBy = ? WHERE userId = ?`,
          [data.status, new Date(), data.verifiedBy || null, verification[0].userId]
        );
      }
    }
    
    const [updated] = await pool.execute('SELECT * FROM kyc_verifications WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const verification = updated[0];
    if (verification.verificationData) {
      verification.verificationData = JSON.parse(verification.verificationData);
    }
    res.json(verification);
  } catch (error) {
    console.error('Error updating verification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// eKYC Provider Integration (Mock)
api.post('/kyc/ekyc/verify', async (req, res) => {
  try {
    const { provider, documentType, documentData, userId } = req.body;
    
    // Simulate API call to eKYC provider
    const mockResponse = {
      success: true,
      verificationId: `EKYC-${Date.now()}`,
      status: Math.random() > 0.3 ? 'verified' : 'failed', // 70% success rate
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      extractedData: {
        name: documentData?.name || 'John Doe',
        dob: documentData?.dob || '1990-01-01',
        documentNumber: documentData?.documentNumber || 'DOC123456',
        address: documentData?.address || '123 Main St'
      },
      verifiedAt: new Date().toISOString(),
      provider: provider || 'mock-provider'
    };
    
    // Save verification result
    const [result] = await pool.execute(
      `INSERT INTO kyc_verifications (userId, provider, documentType, status, verificationData) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, provider || 'mock-provider', documentType, mockResponse.status, JSON.stringify(mockResponse)]
    );
    
    res.json(mockResponse);
  } catch (error) {
    console.error('Error with eKYC verification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Business License Management
api.get('/kyc/business-license/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT businessLicense FROM kyc_profiles WHERE userId = ?', [req.params.userId]);
    if (rows.length === 0 || !rows[0].businessLicense) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(JSON.parse(rows[0].businessLicense));
  } catch (error) {
    console.error('Error fetching business license:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/kyc/business-license/:userId', async (req, res) => {
  try {
    const businessLicense = JSON.stringify(req.body);
    await pool.execute(
      'UPDATE kyc_profiles SET businessLicense = ? WHERE userId = ?',
      [businessLicense, req.params.userId]
    );
    
    const [updated] = await pool.execute('SELECT businessLicense FROM kyc_profiles WHERE userId = ?', [req.params.userId]);
    if (updated.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(JSON.parse(updated[0].businessLicense));
  } catch (error) {
    console.error('Error updating business license:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GST Information Management
api.get('/kyc/gst/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT gstInfo FROM kyc_profiles WHERE userId = ?', [req.params.userId]);
    if (rows.length === 0 || !rows[0].gstInfo) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(JSON.parse(rows[0].gstInfo));
  } catch (error) {
    console.error('Error fetching GST info:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/kyc/gst/:userId', async (req, res) => {
  try {
    const gstInfo = JSON.stringify(req.body);
    await pool.execute(
      'UPDATE kyc_profiles SET gstInfo = ? WHERE userId = ?',
      [gstInfo, req.params.userId]
    );
    
    const [updated] = await pool.execute('SELECT gstInfo FROM kyc_profiles WHERE userId = ?', [req.params.userId]);
    if (updated.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(JSON.parse(updated[0].gstInfo));
  } catch (error) {
    console.error('Error updating GST info:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Credit Limits Management
api.get('/kyc/credit-limit/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT creditLimit FROM kyc_profiles WHERE userId = ?', [req.params.userId]);
    if (rows.length === 0 || !rows[0].creditLimit) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(JSON.parse(rows[0].creditLimit));
  } catch (error) {
    console.error('Error fetching credit limit:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/kyc/credit-limit/:userId', async (req, res) => {
  try {
    const creditLimit = JSON.stringify(req.body);
    await pool.execute(
      'UPDATE kyc_profiles SET creditLimit = ? WHERE userId = ?',
      [creditLimit, req.params.userId]
    );
    
    const [updated] = await pool.execute('SELECT creditLimit FROM kyc_profiles WHERE userId = ?', [req.params.userId]);
    if (updated.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(JSON.parse(updated[0].creditLimit));
  } catch (error) {
    console.error('Error updating credit limit:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Rewards API
api.get('/rewards/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM rewards WHERE userId = ?',
      [req.params.userId]
    );
    if (rows.length === 0) {
      // Create default rewards record if not exists
      await pool.execute(
        'INSERT INTO rewards (userId, points, totalEarned, totalRedeemed, tier, status) VALUES (?, 0, 0, 0, ?, ?)',
        [req.params.userId, 'Bronze', 'active']
      );
      const [newRows] = await pool.execute(
        'SELECT * FROM rewards WHERE userId = ?',
        [req.params.userId]
      );
      return res.json(newRows[0]);
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/rewards/:userId/history', async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM reward_history WHERE userId = ?';
    const params = [req.params.userId];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching reward history:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/rewards/:userId/earn', async (req, res) => {
  try {
    const { points, description, orderId, transactionId } = req.body;
    const userId = req.params.userId;
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Add to history
      await connection.execute(
        'INSERT INTO reward_history (userId, type, points, description, orderId, transactionId, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'earned', points, description || 'Points earned', orderId || null, transactionId || null, 'completed']
      );
      
      // Update or create rewards record
      const [existing] = await connection.execute(
        'SELECT * FROM rewards WHERE userId = ?',
        [userId]
      );
      
      if (existing.length === 0) {
        await connection.execute(
          'INSERT INTO rewards (userId, points, totalEarned, totalRedeemed, tier, status) VALUES (?, ?, ?, 0, ?, ?)',
          [userId, points, points, 'Bronze', 'active']
        );
      } else {
        const newPoints = parseFloat(existing[0].points) + parseFloat(points);
        const newTotalEarned = parseFloat(existing[0].totalEarned) + parseFloat(points);
        
        // Determine tier based on total earned
        let tier = 'Bronze';
        if (newTotalEarned >= 10000) tier = 'Gold';
        else if (newTotalEarned >= 5000) tier = 'Silver';
        
        await connection.execute(
          'UPDATE rewards SET points = ?, totalEarned = ?, tier = ? WHERE userId = ?',
          [newPoints, newTotalEarned, tier, userId]
        );
      }
      
      await connection.commit();
      
      // Fetch updated rewards
      const [updated] = await pool.execute(
        'SELECT * FROM rewards WHERE userId = ?',
        [userId]
      );
      res.json(updated[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error earning rewards:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/rewards/:userId/redeem', async (req, res) => {
  try {
    const { points, description, transactionId } = req.body;
    const userId = req.params.userId;
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if user has enough points
      const [existing] = await connection.execute(
        'SELECT * FROM rewards WHERE userId = ?',
        [userId]
      );
      
      if (existing.length === 0 || parseFloat(existing[0].points) < parseFloat(points)) {
        await connection.rollback();
        return res.status(400).json({ error: 'Insufficient points' });
      }
      
      // Add to history
      await connection.execute(
        'INSERT INTO reward_history (userId, type, points, description, transactionId, status) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'redeemed', points, description || 'Points redeemed', transactionId || null, 'completed']
      );
      
      // Update rewards record
      const newPoints = parseFloat(existing[0].points) - parseFloat(points);
      const newTotalRedeemed = parseFloat(existing[0].totalRedeemed) + parseFloat(points);
      
      await connection.execute(
        'UPDATE rewards SET points = ?, totalRedeemed = ? WHERE userId = ?',
        [newPoints, newTotalRedeemed, userId]
      );
      
      await connection.commit();
      
      // Fetch updated rewards
      const [updated] = await pool.execute(
        'SELECT * FROM rewards WHERE userId = ?',
        [userId]
      );
      res.json(updated[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error redeeming rewards:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Get all rewards
api.get('/rewards', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM rewards ORDER BY totalEarned DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all rewards:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Get all reward history
api.get('/rewards/history/all', async (req, res) => {
  try {
    const { type, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM reward_history WHERE 1=1';
    const params = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all reward history:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Update rewards
api.put('/rewards/:userId', async (req, res) => {
  try {
    const { points, totalEarned, totalRedeemed, tier, status } = req.body;
    await pool.execute(
      'UPDATE rewards SET points = ?, totalEarned = ?, totalRedeemed = ?, tier = ?, status = ? WHERE userId = ?',
      [points || 0, totalEarned || 0, totalRedeemed || 0, tier || 'Bronze', status || 'active', req.params.userId]
    );
    
    const [updated] = await pool.execute('SELECT * FROM rewards WHERE userId = ?', [req.params.userId]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating rewards:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Delete reward history entry
api.delete('/rewards/history/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM reward_history WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reward history:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Outstanding API
api.get('/outstanding/:userId', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM outstanding WHERE userId = ?';
    const params = [req.params.userId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY dueDate ASC, createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching outstanding:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/outstanding/:userId/summary', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        SUM(amount) as totalAmount,
        SUM(pendingAmount) as totalPending,
        SUM(clearedAmount) as totalCleared,
        COUNT(*) as totalCount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdueCount,
        SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) as clearedCount
       FROM outstanding 
       WHERE userId = ?`,
      [req.params.userId]
    );
    res.json(rows[0] || {
      totalAmount: 0,
      totalPending: 0,
      totalCleared: 0,
      totalCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      clearedCount: 0
    });
  } catch (error) {
    console.error('Error fetching outstanding summary:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/outstanding/:id/history', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM outstanding_history WHERE outstandingId = ? ORDER BY createdAt DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching outstanding history:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/outstanding/:userId/pay', async (req, res) => {
  try {
    const { outstandingId, amount, paymentMethod, transactionId, description, paymentDate } = req.body;
    const userId = req.params.userId;
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get outstanding record
      const [outstanding] = await connection.execute(
        'SELECT * FROM outstanding WHERE id = ? AND userId = ?',
        [outstandingId, userId]
      );
      
      if (outstanding.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Outstanding record not found' });
      }
      
      const outstandingRecord = outstanding[0];
      const paymentAmount = parseFloat(amount);
      const newClearedAmount = parseFloat(outstandingRecord.clearedAmount) + paymentAmount;
      const newPendingAmount = parseFloat(outstandingRecord.pendingAmount) - paymentAmount;
      
      if (newPendingAmount < 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Payment amount exceeds pending amount' });
      }
      
      // Determine new status
      let newStatus = 'pending';
      if (newPendingAmount === 0) {
        newStatus = 'cleared';
      } else if (newClearedAmount > 0) {
        newStatus = 'partial';
      }
      
      // Update outstanding record
      await connection.execute(
        'UPDATE outstanding SET clearedAmount = ?, pendingAmount = ?, status = ? WHERE id = ?',
        [newClearedAmount, newPendingAmount, newStatus, outstandingId]
      );
      
      // Add payment history
      await connection.execute(
        'INSERT INTO outstanding_history (outstandingId, userId, amount, paymentMethod, transactionId, paymentDate, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [outstandingId, userId, paymentAmount, paymentMethod || null, transactionId || null, paymentDate || new Date().toISOString().split('T')[0], description || 'Payment received', 'completed']
      );
      
      await connection.commit();
      
      // Fetch updated outstanding record
      const [updated] = await pool.execute('SELECT * FROM outstanding WHERE id = ?', [outstandingId]);
      res.json(updated[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Get all outstanding
api.get('/outstanding', async (req, res) => {
  try {
    const { status, userId } = req.query;
    let query = 'SELECT * FROM outstanding WHERE 1=1';
    const params = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY dueDate ASC, createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all outstanding:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Get all outstanding summary
api.get('/outstanding/summary/all', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        SUM(amount) as totalAmount,
        SUM(pendingAmount) as totalPending,
        SUM(clearedAmount) as totalCleared,
        COUNT(*) as totalCount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdueCount,
        SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) as clearedCount
       FROM outstanding`
    );
    res.json(rows[0] || {
      totalAmount: 0,
      totalPending: 0,
      totalCleared: 0,
      totalCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      clearedCount: 0
    });
  } catch (error) {
    console.error('Error fetching all outstanding summary:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Create outstanding
api.post('/outstanding', async (req, res) => {
  try {
    const { userId, orderId, invoiceNumber, amount, pendingAmount, dueDate, notes } = req.body;
    
    const clearedAmount = 0;
    const status = 'pending';
    
    const [result] = await pool.execute(
      'INSERT INTO outstanding (userId, orderId, invoiceNumber, amount, pendingAmount, clearedAmount, dueDate, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, orderId || null, invoiceNumber || null, amount, pendingAmount || amount, clearedAmount, dueDate || null, status, notes || null]
    );
    
    const [newRecord] = await pool.execute('SELECT * FROM outstanding WHERE id = ?', [result.insertId]);
    res.json(newRecord[0]);
  } catch (error) {
    console.error('Error creating outstanding:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Update outstanding
api.put('/outstanding/:id', async (req, res) => {
  try {
    const { amount, pendingAmount, clearedAmount, dueDate, status, notes } = req.body;
    
    const updates = [];
    const params = [];
    
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
    }
    if (pendingAmount !== undefined) {
      updates.push('pendingAmount = ?');
      params.push(pendingAmount);
    }
    if (clearedAmount !== undefined) {
      updates.push('clearedAmount = ?');
      params.push(clearedAmount);
    }
    if (dueDate !== undefined) {
      updates.push('dueDate = ?');
      params.push(dueDate);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    
    params.push(req.params.id);
    
    await pool.execute(
      `UPDATE outstanding SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const [updated] = await pool.execute('SELECT * FROM outstanding WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating outstanding:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Delete outstanding
api.delete('/outstanding/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM outstanding WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting outstanding:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: Get all outstanding history
api.get('/outstanding/history/all', async (req, res) => {
  try {
    const { outstandingId, userId } = req.query;
    let query = 'SELECT * FROM outstanding_history WHERE 1=1';
    const params = [];
    
    if (outstandingId) {
      query += ' AND outstandingId = ?';
      params.push(outstandingId);
    }
    
    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all outstanding history:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Feedback API
api.get('/feedback', listRoute('feedback'));
api.get('/feedback/:id', getRoute('feedback'));
api.get('/feedback/user/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM feedback WHERE userId = ? ORDER BY createdAt DESC',
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.post('/feedback', createRoute('feedback'));
api.put('/feedback/:id', updateRoute('feedback'));
api.delete('/feedback/:id', deleteRoute('feedback'));

// Favorites API
api.get('/favorites/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, p.* FROM favorites f 
       INNER JOIN products p ON f.productId = p.id 
       WHERE f.userId = ? ORDER BY f.createdAt DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.post('/favorites', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO favorites (userId, productId) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id',
      [userId, productId]
    );
    const [rows] = await pool.execute(
      'SELECT * FROM favorites WHERE userId = ? AND productId = ?',
      [userId, productId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.delete('/favorites/:userId/:productId', async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM favorites WHERE userId = ? AND productId = ?',
      [req.params.userId, req.params.productId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Password Change API
api.post('/auth/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    // In a real app, you would verify oldPassword against the database
    // For now, we'll just return success
    // TODO: Implement actual password verification and hashing
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Notifications API
api.get('/notifications', listRoute('notifications'));
api.get('/notifications/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(`SELECT * FROM notifications WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const item = rows[0];
    // Parse JSON fields
    if (item.data && typeof item.data === 'string') {
      try {
        item.data = JSON.parse(item.data);
      } catch (e) {
        item.data = {};
      }
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.get('/notifications/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { unreadOnly } = req.query;
    
    let query = 'SELECT * FROM notifications WHERE userId = ?';
    const params = [userId];
    
    if (unreadOnly === 'true') {
      query += ' AND isRead = FALSE';
    }
    
    query += ' ORDER BY createdAt DESC LIMIT 100';
    
    const [rows] = await pool.execute(query, params);
    
    // Parse JSON fields
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.data && typeof item.data === 'string') {
        try {
          item.data = JSON.parse(item.data);
        } catch (e) {
          item.data = {};
        }
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.get('/notifications/user/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = FALSE',
      [userId]
    );
    res.json({ count: rows[0].count || 0 });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.post('/notifications', async (req, res) => {
  try {
    const data = req.body;
    const jsonFields = ['data'];
    
    // Stringify JSON fields
    const insertData = { ...data };
    jsonFields.forEach(field => {
      if (insertData[field] && typeof insertData[field] === 'object') {
        insertData[field] = JSON.stringify(insertData[field]);
      }
    });
    
    const fields = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO notifications (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [rows] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
    const item = rows[0];
    
    // Parse JSON fields
    if (item.data && typeof item.data === 'string') {
      try {
        item.data = JSON.parse(item.data);
      } catch (e) {
        item.data = {};
      }
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.put('/notifications/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute(
      'UPDATE notifications SET isRead = TRUE, readAt = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    const [rows] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const item = rows[0];
    if (item.data && typeof item.data === 'string') {
      try {
        item.data = JSON.parse(item.data);
      } catch (e) {
        item.data = {};
      }
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.put('/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.execute(
      'UPDATE notifications SET isRead = TRUE, readAt = CURRENT_TIMESTAMP WHERE userId = ? AND isRead = FALSE',
      [userId]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
api.delete('/notifications/:id', deleteRoute('notifications'));

// Seed dummy products if table is empty
async function seedProducts() {
  try {
    // Check if products table exists
    try {
      await pool.execute('SELECT 1 FROM products LIMIT 1');
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('Products table does not exist yet. Please run schema.sql first.');
        return;
      }
      throw error;
    }
    
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM products');
    const count = rows[0]?.count || 0;
    
    // Get existing product names to avoid duplicates
    const [existingProducts] = await pool.execute('SELECT name FROM products');
    const existingNames = new Set(existingProducts.map(p => p.name));
    
    console.log('Seeding dummy products...');
    const products = [
        ['Paracetamol 500mg Tablets', 'Pain Relief', 45.00, 60.00, 100, 'tablets', 10, 450.00, 5000, '30049099', 12.00, 'MediCorp Pharmaceuticals', 'MC001', 'https://via.placeholder.com/300x300', 'Fast-acting pain relief and fever reducer. Suitable for adults and children above 12 years.', '[{"minQty": 500, "discount": 5}, {"minQty": 1000, "discount": 10}]', 15.00, true],
        ['Amoxicillin 250mg Capsules', 'Antibiotics', 120.00, 180.00, 50, 'capsules', 10, 1200.00, 3000, '30041090', 12.00, 'HealthCare Pharma', 'HP002', 'https://via.placeholder.com/300x300', 'Broad-spectrum antibiotic for bacterial infections. Prescription required.', '[{"minQty": 200, "discount": 8}, {"minQty": 500, "discount": 15}]', 20.00, true],
        ['Cetirizine 10mg Tablets', 'Allergy Relief', 35.00, 50.00, 100, 'tablets', 10, 350.00, 8000, '30049099', 12.00, 'AllerMed Solutions', 'AM003', 'https://via.placeholder.com/300x300', 'Effective antihistamine for allergy symptoms, hay fever, and skin reactions.', '[{"minQty": 500, "discount": 10}, {"minQty": 1000, "discount": 18}]', 25.00, true],
        ['Omeprazole 20mg Capsules', 'Digestive Health', 95.00, 140.00, 30, 'capsules', 14, 1330.00, 4000, '30049099', 12.00, 'DigestCare Pharma', 'DC004', 'https://via.placeholder.com/300x300', 'Proton pump inhibitor for acid reflux, heartburn, and stomach ulcers.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 20}]', 18.00, true],
        ['Ibuprofen 400mg Tablets', 'Pain Relief', 55.00, 75.00, 100, 'tablets', 10, 550.00, 6000, '30049099', 12.00, 'PainFree Pharmaceuticals', 'PF005', 'https://via.placeholder.com/300x300', 'Anti-inflammatory pain reliever for headaches, muscle pain, and arthritis.', '[{"minQty": 500, "discount": 8}, {"minQty": 1000, "discount": 15}]', 12.00, true],
        ['Azithromycin 500mg Tablets', 'Antibiotics', 150.00, 220.00, 30, 'tablets', 3, 450.00, 2500, '30042090', 12.00, 'BioMed Solutions', 'BM006', 'https://via.placeholder.com/300x300', 'Macrolide antibiotic for respiratory and skin infections. Prescription required.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 22.00, true],
        ['Loratadine 10mg Tablets', 'Allergy Relief', 40.00, 55.00, 100, 'tablets', 10, 400.00, 7000, '30049099', 12.00, 'AllerMed Solutions', 'AM007', 'https://via.placeholder.com/300x300', 'Non-drowsy antihistamine for seasonal allergies and hives.', '[{"minQty": 500, "discount": 10}, {"minQty": 1000, "discount": 20}]', 15.00, false],
        ['Pantoprazole 40mg Tablets', 'Digestive Health', 110.00, 160.00, 30, 'tablets', 14, 1540.00, 3500, '30049099', 12.00, 'DigestCare Pharma', 'DC008', 'https://via.placeholder.com/300x300', 'PPI for treating GERD and preventing stomach ulcers.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 22}]', 20.00, false],
        ['Diclofenac 50mg Tablets', 'Pain Relief', 50.00, 70.00, 100, 'tablets', 10, 500.00, 5500, '30049099', 12.00, 'PainFree Pharmaceuticals', 'PF009', 'https://via.placeholder.com/300x300', 'NSAID for reducing inflammation and pain in joints and muscles.', '[{"minQty": 500, "discount": 8}, {"minQty": 1000, "discount": 15}]', 10.00, false],
        ['Ciprofloxacin 500mg Tablets', 'Antibiotics', 130.00, 190.00, 30, 'tablets', 10, 1300.00, 2800, '30042090', 12.00, 'HealthCare Pharma', 'HP010', 'https://via.placeholder.com/300x300', 'Fluoroquinolone antibiotic for urinary tract and respiratory infections.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 18.00, false],
        ['Montelukast 10mg Tablets', 'Respiratory', 85.00, 120.00, 30, 'tablets', 10, 850.00, 3200, '30049099', 12.00, 'RespiraMed Pharma', 'RM011', 'https://via.placeholder.com/300x300', 'Leukotriene receptor antagonist for asthma and allergy management.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 20}]', 15.00, true],
        ['Ranitidine 150mg Tablets', 'Digestive Health', 25.00, 35.00, 100, 'tablets', 10, 250.00, 9000, '30049099', 12.00, 'DigestCare Pharma', 'DC012', 'https://via.placeholder.com/300x300', 'H2 blocker for reducing stomach acid and treating ulcers.', '[{"minQty": 500, "discount": 15}, {"minQty": 1000, "discount": 25}]', 20.00, false],
        ['Levothyroxine 50mcg Tablets', 'Hormones', 45.00, 65.00, 30, 'tablets', 30, 1350.00, 2000, '30043990', 12.00, 'HormoneCare Pharma', 'HC013', 'https://via.placeholder.com/300x300', 'Thyroid hormone replacement therapy. Prescription required.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 12.00, false],
        ['Metformin 500mg Tablets', 'Diabetes', 30.00, 45.00, 100, 'tablets', 10, 300.00, 10000, '30049099', 12.00, 'DiabCare Solutions', 'DS014', 'https://via.placeholder.com/300x300', 'First-line medication for type 2 diabetes management.', '[{"minQty": 500, "discount": 12}, {"minQty": 1000, "discount": 22}]', 18.00, true],
        ['Atorvastatin 10mg Tablets', 'Cardiovascular', 75.00, 110.00, 30, 'tablets', 10, 750.00, 3800, '30049099', 12.00, 'CardioMed Pharma', 'CM015', 'https://via.placeholder.com/300x300', 'Statin medication for lowering cholesterol levels.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 15.00, true],
        ['Amlodipine 5mg Tablets', 'Cardiovascular', 40.00, 60.00, 30, 'tablets', 10, 400.00, 4500, '30049099', 12.00, 'CardioMed Pharma', 'CM016', 'https://via.placeholder.com/300x300', 'Calcium channel blocker for hypertension and angina.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 20}]', 12.00, false],
        ['Losartan 50mg Tablets', 'Cardiovascular', 55.00, 80.00, 30, 'tablets', 10, 550.00, 4000, '30049099', 12.00, 'CardioMed Pharma', 'CM017', 'https://via.placeholder.com/300x300', 'ARB medication for treating high blood pressure.', '[{"minQty": 100, "discount": 10}, {"minQty": 300, "discount": 18}]', 14.00, false],
        ['Sertraline 50mg Tablets', 'Mental Health', 90.00, 130.00, 30, 'tablets', 10, 900.00, 1800, '30049099', 12.00, 'NeuroCare Pharma', 'NC018', 'https://via.placeholder.com/300x300', 'SSRI antidepressant for depression and anxiety disorders.', '[{"minQty": 100, "discount": 12}, {"minQty": 300, "discount": 20}]', 16.00, false],
        ['Salbutamol Inhaler 100mcg', 'Respiratory', 120.00, 180.00, 1, 'inhaler', 1, 120.00, 2500, '30049099', 12.00, 'RespiraMed Pharma', 'RM019', 'https://via.placeholder.com/300x300', 'Bronchodilator inhaler for quick relief from asthma symptoms.', '[{"minQty": 10, "discount": 8}, {"minQty": 50, "discount": 15}]', 20.00, true],
        ['Budesonide Inhaler 200mcg', 'Respiratory', 280.00, 400.00, 1, 'inhaler', 1, 280.00, 1500, '30049099', 12.00, 'RespiraMed Pharma', 'RM020', 'https://via.placeholder.com/300x300', 'Corticosteroid inhaler for long-term asthma control.', '[{"minQty": 10, "discount": 10}, {"minQty": 50, "discount": 18}]', 18.00, false]
      ];
      
    const insertQuery = `INSERT INTO products (name, category, price, retailPrice, moq, unit, packSize, pricePerPack, stockQuantity, hsnCode, gstRate, supplier, supplierCode, image, description, volumeDiscounts, discount, isTrending) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    let insertedCount = 0;
    for (const product of products) {
      // Skip if product already exists
      if (existingNames.has(product[0])) {
        continue;
      }
      
      try {
        await pool.execute(insertQuery, product);
        insertedCount++;
      } catch (error) {
        console.error('Error inserting product:', product[0], error.message);
      }
    }
    
    if (insertedCount > 0) {
      console.log(`Successfully seeded ${insertedCount} new products`);
    } else {
      console.log(`All products already exist in database (${count} products found)`);
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
}

// Seed products endpoint (for manual seeding)
api.post('/seed/products', async (_req, res) => {
  try {
    await seedProducts();
    res.json({ success: true, message: 'Products seeded successfully' });
  } catch (error) {
    console.error('Error seeding products:', error);
    res.status(500).json({ error: 'Failed to seed products' });
  }
});

// Inventory Service API Endpoints

// Warehouses
api.get('/warehouses', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM warehouses ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/warehouses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM warehouses WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/warehouses', async (req, res) => {
  try {
    const data = req.body;
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO warehouses (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM warehouses WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating warehouse:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/warehouses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE warehouses SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM warehouses WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/warehouses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM warehouses WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Stock Inventory
api.get('/stock-inventory', async (req, res) => {
  try {
    const { productId, warehouseId } = req.query;
    let query = `
      SELECT si.*, p.name as productName, p.image as productImage, w.name as warehouseName, w.code as warehouseCode
      FROM stock_inventory si
      JOIN products p ON si.productId = p.id
      JOIN warehouses w ON si.warehouseId = w.id
      WHERE 1=1
    `;
    const params = [];
    
    if (productId) {
      query += ' AND si.productId = ?';
      params.push(parseInt(productId));
    }
    
    if (warehouseId) {
      query += ' AND si.warehouseId = ?';
      params.push(parseInt(warehouseId));
    }
    
    query += ' ORDER BY si.expiryDate ASC, si.createdAt ASC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching stock inventory:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/stock-inventory/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(`
      SELECT si.*, p.name as productName, p.image as productImage, w.name as warehouseName, w.code as warehouseCode
      FROM stock_inventory si
      JOIN products p ON si.productId = p.id
      JOIN warehouses w ON si.warehouseId = w.id
      WHERE si.id = ?
    `, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching stock inventory:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/stock-inventory', async (req, res) => {
  try {
    const data = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert stock inventory
      const fields = Object.keys(data);
      const values = fields.map(field => data[field]);
      const placeholders = fields.map(() => '?').join(', ');
      
      const [result] = await connection.execute(
        `INSERT INTO stock_inventory (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
      
      // Create stock transaction
      await connection.execute(
        `INSERT INTO stock_transactions (productId, warehouseId, stockInventoryId, transactionType, quantity, batchNumber, referenceType, notes)
         VALUES (?, ?, ?, 'in', ?, ?, 'stock_inventory', ?)`,
        [data.productId, data.warehouseId, result.insertId, data.quantity, data.batchNumber || null, 'Stock added']
      );
      
      // Check for stock_low event
      const [totalStock] = await connection.execute(
        `SELECT SUM(availableQuantity) as totalAvailable FROM stock_inventory WHERE productId = ? AND warehouseId = ?`,
        [data.productId, data.warehouseId]
      );
      
      const totalAvailable = totalStock[0]?.totalAvailable || 0;
      if (totalAvailable < 10) { // Threshold can be configurable
        await connection.execute(
          `INSERT INTO stock_events (productId, warehouseId, eventType, quantity, currentQuantity, threshold, message, isPublished)
           VALUES (?, ?, 'stock_low', ?, ?, 10, 'Stock is low', FALSE)`,
          [data.productId, data.warehouseId, data.quantity, totalAvailable]
        );
      }
      
      await connection.commit();
      
      const [newItem] = await pool.execute(`
        SELECT si.*, p.name as productName, p.image as productImage, w.name as warehouseName, w.code as warehouseCode
        FROM stock_inventory si
        JOIN products p ON si.productId = p.id
        JOIN warehouses w ON si.warehouseId = w.id
        WHERE si.id = ?
      `, [result.insertId]);
      
      res.status(201).json(newItem[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating stock inventory:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/stock-inventory/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    // Get old quantity
    const [oldStock] = await pool.execute('SELECT * FROM stock_inventory WHERE id = ?', [id]);
    if (oldStock.length === 0) return res.status(404).json({ error: 'Not found' });
    const oldQuantity = oldStock[0].quantity;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);
      values.push(id);
      
      await connection.execute(`UPDATE stock_inventory SET ${setClause} WHERE id = ?`, values);
      
      // Create stock transaction if quantity changed
      const quantityDiff = data.quantity - oldQuantity;
      if (quantityDiff !== 0) {
        await connection.execute(
          `INSERT INTO stock_transactions (productId, warehouseId, stockInventoryId, transactionType, quantity, batchNumber, referenceType, notes)
           VALUES (?, ?, ?, ?, ?, ?, 'stock_inventory', ?)`,
          [
            oldStock[0].productId,
            oldStock[0].warehouseId,
            id,
            quantityDiff > 0 ? 'in' : 'out',
            Math.abs(quantityDiff),
            data.batchNumber || oldStock[0].batchNumber || null,
            quantityDiff > 0 ? 'Stock adjusted (increase)' : 'Stock adjusted (decrease)'
          ]
        );
        
        // Check for stock_low event
        const [totalStock] = await connection.execute(
          `SELECT SUM(availableQuantity) as totalAvailable FROM stock_inventory WHERE productId = ? AND warehouseId = ?`,
          [oldStock[0].productId, oldStock[0].warehouseId]
        );
        
        const totalAvailable = totalStock[0]?.totalAvailable || 0;
        if (totalAvailable < 10) {
          await connection.execute(
            `INSERT INTO stock_events (productId, warehouseId, eventType, quantity, currentQuantity, threshold, message, isPublished)
             VALUES (?, ?, 'stock_low', ?, ?, 10, 'Stock is low', FALSE)`,
            [oldStock[0].productId, oldStock[0].warehouseId, Math.abs(quantityDiff), totalAvailable]
          );
        }
      }
      
      await connection.commit();
      
      const [updated] = await pool.execute(`
        SELECT si.*, p.name as productName, p.image as productImage, w.name as warehouseName, w.code as warehouseCode
        FROM stock_inventory si
        JOIN products p ON si.productId = p.id
        JOIN warehouses w ON si.warehouseId = w.id
        WHERE si.id = ?
      `, [id]);
      
      res.json(updated[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating stock inventory:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/stock-inventory/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM stock_inventory WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stock inventory:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Stock Operations - Debit stock (FIFO/LIFO)
api.post('/stock-inventory/debit', async (req, res) => {
  try {
    const { productId, warehouseId, quantity, orderId, notes } = req.body;
    const stockMethod = req.body.stockMethod || 'FIFO';
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get stock items based on FIFO/LIFO
      const orderBy = stockMethod === 'FIFO' ? 'ASC' : 'DESC';
      const [stockItems] = await connection.execute(
        `SELECT * FROM stock_inventory 
         WHERE productId = ? AND warehouseId = ? AND availableQuantity > 0
         ORDER BY expiryDate ${orderBy}, createdAt ${orderBy}
         FOR UPDATE`,
        [productId, warehouseId]
      );
      
      let remainingQty = quantity;
      const debitedBatches = [];
      
      for (const item of stockItems) {
        if (remainingQty <= 0) break;
        
        const qtyToDebit = Math.min(remainingQty, item.availableQuantity);
        const newQuantity = item.quantity - qtyToDebit;
        // Keep reserved quantity same, just reduce total quantity
        const newReservedQty = Math.min(item.reservedQuantity, newQuantity);
        
        await connection.execute(
          `UPDATE stock_inventory SET quantity = ?, reservedQuantity = ? WHERE id = ?`,
          [newQuantity, newReservedQty, item.id]
        );
        
        // Create transaction
        await connection.execute(
          `INSERT INTO stock_transactions (productId, warehouseId, stockInventoryId, transactionType, quantity, batchNumber, referenceType, referenceId, notes)
           VALUES (?, ?, ?, 'out', ?, ?, 'order', ?, ?)`,
          [productId, warehouseId, item.id, qtyToDebit, item.batchNumber || null, orderId || null, notes || 'Stock debited']
        );
        
        // Create stock_debited event
        await connection.execute(
          `INSERT INTO stock_events (productId, warehouseId, eventType, quantity, batchNumber, previousQuantity, currentQuantity, message, metadata, isPublished)
           VALUES (?, ?, 'stock_debited', ?, ?, ?, ?, ?, ?, FALSE)`,
          [
            productId,
            warehouseId,
            qtyToDebit,
            item.batchNumber || null,
            item.quantity,
            newQuantity,
            `Stock debited: ${qtyToDebit} units`,
            JSON.stringify({ orderId, stockMethod, batchNumber: item.batchNumber })
          ]
        );
        
        debitedBatches.push({
          stockInventoryId: item.id,
          batchNumber: item.batchNumber,
          quantity: qtyToDebit
        });
        
        remainingQty -= qtyToDebit;
      }
      
      if (remainingQty > 0) {
        await connection.rollback();
        return res.status(400).json({ error: `Insufficient stock. Only ${quantity - remainingQty} units available.` });
      }
      
      // Check for stock_low event
      const [totalStock] = await connection.execute(
        `SELECT SUM(availableQuantity) as totalAvailable FROM stock_inventory WHERE productId = ? AND warehouseId = ?`,
        [productId, warehouseId]
      );
      
      const totalAvailable = totalStock[0]?.totalAvailable || 0;
      if (totalAvailable < 10) {
        await connection.execute(
          `INSERT INTO stock_events (productId, warehouseId, eventType, quantity, currentQuantity, threshold, message, isPublished)
           VALUES (?, ?, 'stock_low', ?, ?, 10, 'Stock is low after debit', FALSE)`,
          [productId, warehouseId, quantity, totalAvailable]
        );
      }
      
      await connection.commit();
      
      res.json({
        success: true,
        debitedBatches,
        totalDebited: quantity
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error debiting stock:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// PO Reservations
api.get('/po-reservations', async (req, res) => {
  try {
    const { poNumber, productId, warehouseId, status } = req.query;
    let query = `
      SELECT por.*, p.name as productName, p.image as productImage, w.name as warehouseName
      FROM po_reservations por
      JOIN products p ON por.productId = p.id
      JOIN warehouses w ON por.warehouseId = w.id
      WHERE 1=1
    `;
    const params = [];
    
    if (poNumber) {
      query += ' AND por.poNumber = ?';
      params.push(poNumber);
    }
    
    if (productId) {
      query += ' AND por.productId = ?';
      params.push(parseInt(productId));
    }
    
    if (warehouseId) {
      query += ' AND por.warehouseId = ?';
      params.push(parseInt(warehouseId));
    }
    
    if (status) {
      query += ' AND por.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY por.reservedAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching PO reservations:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/po-reservations', async (req, res) => {
  try {
    const { poNumber, productId, warehouseId, quantity, batchNumber, expiryDate, notes, stockMethod = 'FIFO' } = req.body;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get available stock based on FIFO/LIFO
      const orderBy = stockMethod === 'FIFO' ? 'ASC' : 'DESC';
      const [stockItems] = await connection.execute(
        `SELECT * FROM stock_inventory 
         WHERE productId = ? AND warehouseId = ? AND availableQuantity > 0
         ${batchNumber ? ' AND batchNumber = ?' : ''}
         ORDER BY expiryDate ${orderBy}, createdAt ${orderBy}
         FOR UPDATE`,
        batchNumber ? [productId, warehouseId, batchNumber] : [productId, warehouseId]
      );
      
      let remainingQty = quantity;
      const reservedItems = [];
      
      for (const item of stockItems) {
        if (remainingQty <= 0) break;
        
        const qtyToReserve = Math.min(remainingQty, item.availableQuantity);
        const newReservedQty = item.reservedQuantity + qtyToReserve;
        
        await connection.execute(
          `UPDATE stock_inventory SET reservedQuantity = ? WHERE id = ?`,
          [newReservedQty, item.id]
        );
        
        // Create reservation
        const [reservationResult] = await connection.execute(
          `INSERT INTO po_reservations (poNumber, productId, warehouseId, stockInventoryId, batchNumber, quantity, expiryDate, notes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reserved')`,
          [poNumber, productId, warehouseId, item.id, item.batchNumber || batchNumber || null, qtyToReserve, expiryDate || null, notes || null]
        );
        
        reservedItems.push({
          reservationId: reservationResult.insertId,
          stockInventoryId: item.id,
          batchNumber: item.batchNumber,
          quantity: qtyToReserve
        });
        
        remainingQty -= qtyToReserve;
      }
      
      if (remainingQty > 0) {
        await connection.rollback();
        return res.status(400).json({ error: `Insufficient stock. Only ${quantity - remainingQty} units available for reservation.` });
      }
      
      await connection.commit();
      
      const [reservations] = await pool.execute(`
        SELECT por.*, p.name as productName, p.image as productImage, w.name as warehouseName
        FROM po_reservations por
        JOIN products p ON por.productId = p.id
        JOIN warehouses w ON por.warehouseId = w.id
        WHERE por.poNumber = ?
      `, [poNumber]);
      
      res.status(201).json(reservations);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating PO reservation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/po-reservations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE po_reservations SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute(`
      SELECT por.*, p.name as productName, p.image as productImage, w.name as warehouseName
      FROM po_reservations por
      JOIN products p ON por.productId = p.id
      JOIN warehouses w ON por.warehouseId = w.id
      WHERE por.id = ?
    `, [id]);
    
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating PO reservation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/po-reservations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get reservation details
      const [reservation] = await connection.execute('SELECT * FROM po_reservations WHERE id = ?', [id]);
      if (reservation.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Not found' });
      }
      
      const resData = reservation[0];
      
      // Release reserved quantity
      if (resData.stockInventoryId && resData.status === 'reserved') {
        await connection.execute(
          `UPDATE stock_inventory SET reservedQuantity = reservedQuantity - ? WHERE id = ?`,
          [resData.quantity, resData.stockInventoryId]
        );
      }
      
      // Delete reservation
      await connection.execute('DELETE FROM po_reservations WHERE id = ?', [id]);
      
      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting PO reservation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Stock Events
api.get('/stock-events', async (req, res) => {
  try {
    const { productId, warehouseId, eventType, isPublished } = req.query;
    let query = `
      SELECT se.*, p.name as productName, w.name as warehouseName
      FROM stock_events se
      JOIN products p ON se.productId = p.id
      LEFT JOIN warehouses w ON se.warehouseId = w.id
      WHERE 1=1
    `;
    const params = [];
    
    if (productId) {
      query += ' AND se.productId = ?';
      params.push(parseInt(productId));
    }
    
    if (warehouseId) {
      query += ' AND se.warehouseId = ?';
      params.push(parseInt(warehouseId));
    }
    
    if (eventType) {
      query += ' AND se.eventType = ?';
      params.push(eventType);
    }
    
    if (isPublished !== undefined) {
      query += ' AND se.isPublished = ?';
      params.push(isPublished === 'true');
    }
    
    query += ' ORDER BY se.createdAt DESC LIMIT 100';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching stock events:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/stock-events/:id/publish', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute(
      'UPDATE stock_events SET isPublished = TRUE, publishedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error publishing stock event:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/stock-inventory/summary/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const { warehouseId } = req.query;
    
    let query = `
      SELECT 
        si.warehouseId,
        w.name as warehouseName,
        w.code as warehouseCode,
        SUM(si.quantity) as totalQuantity,
        SUM(si.reservedQuantity) as totalReserved,
        SUM(si.availableQuantity) as totalAvailable,
        COUNT(DISTINCT si.batchNumber) as batchCount,
        MIN(si.expiryDate) as earliestExpiry
      FROM stock_inventory si
      JOIN warehouses w ON si.warehouseId = w.id
      WHERE si.productId = ?
    `;
    const params = [productId];
    
    if (warehouseId) {
      query += ' AND si.warehouseId = ?';
      params.push(parseInt(warehouseId));
    }
    
    query += ' GROUP BY si.warehouseId, w.name, w.code';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Order / PO Service API Endpoints

// Purchase Orders
api.get('/purchase-orders', async (req, res) => {
  try {
    const { status, warehouseId } = req.query;
    let query = `
      SELECT po.*, w.name as warehouseName, w.code as warehouseCode
      FROM purchase_orders po
      JOIN warehouses w ON po.warehouseId = w.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND po.status = ?';
      params.push(status);
    }
    
    if (warehouseId) {
      query += ' AND po.warehouseId = ?';
      params.push(parseInt(warehouseId));
    }
    
    query += ' ORDER BY po.orderDate DESC, po.createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/purchase-orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [orders] = await pool.execute(`
      SELECT po.*, w.name as warehouseName, w.code as warehouseCode
      FROM purchase_orders po
      JOIN warehouses w ON po.warehouseId = w.id
      WHERE po.id = ?
    `, [id]);
    
    if (orders.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const [items] = await pool.execute(`
      SELECT poi.*, p.name as productName, p.image as productImage
      FROM po_items poi
      LEFT JOIN products p ON poi.productId = p.id
      WHERE poi.poId = ?
    `, [id]);
    
    const [statusHistory] = await pool.execute(`
      SELECT * FROM order_status_history
      WHERE orderId = ? AND orderType = 'purchase_order'
      ORDER BY changedAt DESC
    `, [id]);
    
    res.json({
      ...orders[0],
      items: items,
      statusHistory: statusHistory
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/purchase-orders', async (req, res) => {
  try {
    const { items, ...poData } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Generate PO Number
      const poNumber = poData.poNumber || `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Calculate totals
      let totalAmount = 0;
      let taxAmount = 0;
      let discountAmount = 0;
      
      if (items && items.length > 0) {
        items.forEach(item => {
          const subtotal = (item.quantity * item.unitPrice) - (item.discount || 0);
          totalAmount += subtotal;
          discountAmount += (item.discount || 0);
          taxAmount += (subtotal * (item.taxRate || 0) / 100);
        });
      }
      
      const finalAmount = totalAmount + taxAmount - discountAmount;
      
      // Insert PO
      const [poResult] = await connection.execute(
        `INSERT INTO purchase_orders (
          poNumber, supplierId, supplierName, warehouseId, status, totalAmount, taxAmount, 
          discountAmount, finalAmount, orderDate, expectedDeliveryDate, createdBy, notes
        ) VALUES (?, ?, ?, ?, 'created', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          poNumber,
          poData.supplierId || null,
          poData.supplierName || null,
          poData.warehouseId,
          totalAmount,
          taxAmount,
          discountAmount,
          finalAmount,
          poData.orderDate || new Date().toISOString().split('T')[0],
          poData.expectedDeliveryDate || null,
          poData.createdBy || null,
          poData.notes || null
        ]
      );
      
      const poId = poResult.insertId;
      
      // Insert PO Items
      if (items && items.length > 0) {
        for (const item of items) {
          const subtotal = (item.quantity * item.unitPrice) - (item.discount || 0);
          await connection.execute(
            `INSERT INTO po_items (
              poId, productId, productName, sku, quantity, unitPrice, discount, taxRate, 
              subtotal, batchNumber, expiryDate, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              poId,
              item.productId,
              item.productName || null,
              item.sku || null,
              item.quantity,
              item.unitPrice,
              item.discount || 0,
              item.taxRate || 0,
              subtotal,
              item.batchNumber || null,
              item.expiryDate || null,
              item.notes || null
            ]
          );
        }
      }
      
      // Insert status history
      await connection.execute(
        `INSERT INTO order_status_history (orderId, orderType, status, previousStatus, changedBy, notes)
         VALUES (?, 'purchase_order', 'created', NULL, ?, 'Purchase order created')`,
        [poId, poData.createdBy || null]
      );
      
      await connection.commit();
      
      // Fetch created PO with items
      const [createdPO] = await pool.execute(`
        SELECT po.*, w.name as warehouseName, w.code as warehouseCode
        FROM purchase_orders po
        JOIN warehouses w ON po.warehouseId = w.id
        WHERE po.id = ?
      `, [poId]);
      
      const [createdItems] = await pool.execute(`
        SELECT poi.*, p.name as productName, p.image as productImage
        FROM po_items poi
        LEFT JOIN products p ON poi.productId = p.id
        WHERE poi.poId = ?
      `, [poId]);
      
      res.status(201).json({
        ...createdPO[0],
        items: createdItems
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Order State Machine - Update PO Status
api.put('/purchase-orders/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, notes, changedBy } = req.body;
    
    const validStatuses = ['created', 'pending_approval', 'approved', 'confirmed', 'packed', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get current PO
      const [orders] = await connection.execute('SELECT * FROM purchase_orders WHERE id = ?', [id]);
      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Not found' });
      }
      
      const currentPO = orders[0];
      const previousStatus = currentPO.status;
      
      // Validate state transition
      const statusFlow = {
        'created': ['pending_approval', 'cancelled'],
        'pending_approval': ['approved', 'cancelled'],
        'approved': ['confirmed', 'cancelled'],
        'confirmed': ['packed', 'cancelled'],
        'packed': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': ['invoiced', 'cancelled'],
        'invoiced': ['paid', 'cancelled'],
        'paid': [],
        'cancelled': []
      };
      
      if (!statusFlow[previousStatus]?.includes(status)) {
        await connection.rollback();
        return res.status(400).json({ error: `Invalid status transition from ${previousStatus} to ${status}` });
      }
      
      // Update PO status
      const updateData = { status };
      if (status === 'approved') {
        updateData.approvedBy = changedBy || null;
        updateData.approvedAt = new Date();
      }
      if (status === 'delivered') {
        updateData.actualDeliveryDate = new Date().toISOString().split('T')[0];
      }
      if (status === 'invoiced') {
        updateData.invoicedDate = new Date();
      }
      if (status === 'paid') {
        updateData.paidDate = new Date();
      }
      if (status === 'cancelled') {
        updateData.cancelledBy = changedBy || null;
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = notes || 'Order cancelled';
      }
      
      const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateData);
      updateValues.push(id);
      
      await connection.execute(
        `UPDATE purchase_orders SET ${updateFields} WHERE id = ?`,
        updateValues
      );
      
      // Insert status history
      await connection.execute(
        `INSERT INTO order_status_history (orderId, orderType, status, previousStatus, changedBy, notes, metadata)
         VALUES (?, 'purchase_order', ?, ?, ?, ?, ?)`,
        [id, status, previousStatus, changedBy || null, notes || null, JSON.stringify({ timestamp: new Date() })]
      );
      
      // If cancelled, create cancellation record
      if (status === 'cancelled') {
        await connection.execute(
          `INSERT INTO order_cancellations (orderId, orderType, reason, cancelledBy, refundAmount, refundStatus)
           VALUES (?, 'purchase_order', ?, ?, 0, 'pending')`,
          [id, notes || 'Order cancelled', changedBy || null]
        );
      }
      
      await connection.commit();
      
      // Fetch updated PO
      const [updatedPO] = await pool.execute(`
        SELECT po.*, w.name as warehouseName, w.code as warehouseCode
        FROM purchase_orders po
        JOIN warehouses w ON po.warehouseId = w.id
        WHERE po.id = ?
      `, [id]);
      
      res.json(updatedPO[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating PO status:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Customer Orders
api.get('/customer-orders', async (req, res) => {
  try {
    const { status, userId, warehouseId, paymentStatus } = req.query;
    let query = `
      SELECT co.*, 
        u.name as userName, u.email as userEmail, u.phone as userPhone,
        w.name as warehouseName, w.code as warehouseCode
      FROM customer_orders co
      LEFT JOIN users u ON co.userId = u.id
      LEFT JOIN warehouses w ON co.warehouseId = w.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND co.status = ?';
      params.push(status);
    }
    
    if (userId) {
      query += ' AND co.userId = ?';
      params.push(parseInt(userId));
    }
    
    if (warehouseId) {
      query += ' AND co.warehouseId = ?';
      params.push(parseInt(warehouseId));
    }
    
    if (paymentStatus) {
      query += ' AND co.paymentStatus = ?';
      params.push(paymentStatus);
    }
    
    query += ' ORDER BY co.orderDate DESC, co.createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/customer-orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [orders] = await pool.execute(`
      SELECT co.*, 
        u.name as userName, u.email as userEmail, u.phone as userPhone,
        w.name as warehouseName, w.code as warehouseCode
      FROM customer_orders co
      LEFT JOIN users u ON co.userId = u.id
      LEFT JOIN warehouses w ON co.warehouseId = w.id
      WHERE co.id = ?
    `, [id]);
    
    if (orders.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const [items] = await pool.execute(`
      SELECT oi.*, p.name as productName, p.image as productImage
      FROM order_items oi
      LEFT JOIN products p ON oi.productId = p.id
      WHERE oi.orderId = ?
    `, [id]);
    
    const [statusHistory] = await pool.execute(`
      SELECT * FROM order_status_history
      WHERE orderId = ? AND orderType = 'customer_order'
      ORDER BY changedAt DESC
    `, [id]);
    
    res.json({
      ...orders[0],
      items: items,
      statusHistory: statusHistory
    });
  } catch (error) {
    console.error('Error fetching customer order:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/customer-orders', async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Generate Order Number
      const orderNumber = orderData.orderNumber || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Calculate totals - use provided values if available, otherwise calculate
      let totalAmount = orderData.subtotal || 0;
      let taxAmount = orderData.tax || 0;
      let discountAmount = orderData.discount || 0;
      let promoDiscountAmount = orderData.promoDiscount || 0;
      
      if (!orderData.subtotal && items && items.length > 0) {
        // Fallback calculation if subtotal not provided
        items.forEach(item => {
          const subtotal = (item.quantity * (item.unitPrice || item.price)) - (item.discount || 0);
          totalAmount += subtotal;
          discountAmount += (item.discount || 0);
          taxAmount += (subtotal * (item.taxRate || 0) / 100);
        });
      }
      
      const shippingAmount = orderData.deliveryCharge || orderData.shippingAmount || 0;
      const finalAmount = orderData.total || (totalAmount + taxAmount + shippingAmount - discountAmount - promoDiscountAmount);
      
      // Determine payment method
      let paymentMethodValue = null;
      if (orderData.paymentMethod) {
        if (typeof orderData.paymentMethod === 'object' && orderData.paymentMethod.id) {
          paymentMethodValue = orderData.paymentMethod.id;
        } else if (typeof orderData.paymentMethod === 'string') {
          paymentMethodValue = orderData.paymentMethod;
        }
      }
      
      // Insert Order
      const [orderResult] = await connection.execute(
        `INSERT INTO customer_orders (
          orderNumber, userId, distributorId, retailerId, warehouseId, status, orderType,
          totalAmount, taxAmount, discountAmount, shippingAmount, finalAmount,
          paymentMethod, paymentStatus, orderDate, expectedDeliveryDate,
          shippingAddress, billingAddress, notes
        ) VALUES (?, ?, ?, ?, ?, 'created', ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          orderData.userId,
          orderData.distributorId || null,
          orderData.retailerId || null,
          orderData.warehouseId || null,
          orderData.orderType || 'retail',
          totalAmount,
          taxAmount,
          discountAmount + promoDiscountAmount,
          shippingAmount,
          finalAmount,
          paymentMethodValue,
          orderData.orderDate || new Date(),
          orderData.expectedDeliveryDate || null,
          orderData.shippingAddress || null,
          orderData.billingAddress || null,
          orderData.notes || null
        ]
      );
      
      const orderId = orderResult.insertId;
      
      // Insert Order Items
      if (items && items.length > 0) {
        for (const item of items) {
          const unitPrice = item.unitPrice || item.price || 0;
          const subtotal = (item.quantity * unitPrice) - (item.discount || 0);
          await connection.execute(
            `INSERT INTO order_items (
              orderId, productId, productName, sku, quantity, unitPrice, discount, taxRate, 
              subtotal, batchNumber, expiryDate, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.productId || item.id,
              item.productName || item.name || null,
              item.sku || null,
              item.quantity,
              unitPrice,
              item.discount || 0,
              item.taxRate || 0,
              subtotal,
              item.batchNumber || null,
              item.expiryDate || null,
              item.notes || null
            ]
          );
        }
      }
      
      // Insert status history
      await connection.execute(
        `INSERT INTO order_status_history (orderId, orderType, status, previousStatus, changedBy, notes)
         VALUES (?, 'customer_order', 'created', NULL, ?, 'Order created')`,
        [orderId, orderData.userId || null]
      );
      
      // Handle credit limit and payment terms for credit payments
      if (paymentMethodValue === 'credit') {
        const userId = orderData.userId;
        
        if (userId) {
          // Get credit limit
          const [creditLimits] = await connection.execute(
            'SELECT * FROM credit_limits WHERE userId = ? AND isActive = TRUE',
            [userId]
          );
          
          if (creditLimits.length > 0) {
            const creditLimit = creditLimits[0];
            
            // Update used credit
            const newUsedCredit = (creditLimit.usedCredit || 0) + finalAmount;
            await connection.execute(
              'UPDATE credit_limits SET usedCredit = ? WHERE id = ?',
              [newUsedCredit, creditLimit.id]
            );
            
            // Get payment terms
            const paymentDays = creditLimit.paymentTerms || 0;
            const dueDate = paymentDays > 0 
              ? new Date(Date.now() + paymentDays * 24 * 60 * 60 * 1000)
              : null;
            
            // Create outstanding record for delayed payment tracking
            if (dueDate) {
              await connection.execute(
                `INSERT INTO outstanding (
                  userId, orderId, orderNumber, orderType, amount, dueDate, status, paymentTerms, 
                  interestRate, lateFeePercentage, description
                ) VALUES (?, ?, ?, 'customer_order', ?, ?, 'pending', ?, ?, ?, ?)`,
                [
                  userId,
                  orderId,
                  orderNumber,
                  finalAmount,
                  dueDate,
                  paymentDays,
                  creditLimit.interestRate || 0,
                  creditLimit.lateFeePercentage || 0,
                  `Outstanding for order ${orderNumber}`
                ]
              );
            }
            
            // Update payment status to credit
            await connection.execute(
              'UPDATE customer_orders SET paymentStatus = ? WHERE id = ?',
              ['credit', orderId]
            );
          }
        }
      }
      
      // Update promo code usage if promo code was used
      if (orderData.promoCode) {
        await connection.execute(
          'UPDATE promo_codes SET usedCount = usedCount + 1 WHERE code = ?',
          [orderData.promoCode.toUpperCase()]
        );
        
        // Record promo code usage
        await connection.execute(
          `INSERT INTO promo_code_usage (promoCodeId, userId, orderId, orderNumber, discountAmount)
           SELECT id, ?, ?, ?, ? FROM promo_codes WHERE code = ?`,
          [orderData.userId, orderId, orderNumber, orderData.promoDiscount || 0, orderData.promoCode.toUpperCase()]
        );
      }
      
      await connection.commit();
      
      // Fetch created order with items
      const [createdOrder] = await pool.execute(`
        SELECT co.*, 
          u.name as userName, u.email as userEmail, u.phone as userPhone,
          w.name as warehouseName, w.code as warehouseCode
        FROM customer_orders co
        LEFT JOIN users u ON co.userId = u.id
        LEFT JOIN warehouses w ON co.warehouseId = w.id
        WHERE co.id = ?
      `, [orderId]);
      
      const [createdItems] = await pool.execute(`
        SELECT oi.*, p.name as productName, p.image as productImage
        FROM order_items oi
        LEFT JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
      `, [orderId]);
      
      res.status(201).json({
        ...createdOrder[0],
        items: createdItems
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating customer order:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Order State Machine - Update Customer Order Status
api.put('/customer-orders/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, notes, changedBy, trackingNumber, invoiceNumber } = req.body;
    
    const validStatuses = ['created', 'confirmed', 'packed', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get current order
      const [orders] = await connection.execute('SELECT * FROM customer_orders WHERE id = ?', [id]);
      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Not found' });
      }
      
      const currentOrder = orders[0];
      const previousStatus = currentOrder.status;
      
      // Validate state transition
      const statusFlow = {
        'created': ['confirmed', 'cancelled'],
        'confirmed': ['packed', 'cancelled'],
        'packed': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': ['invoiced', 'returned', 'cancelled'],
        'invoiced': ['paid', 'cancelled'],
        'paid': [],
        'cancelled': [],
        'returned': []
      };
      
      if (!statusFlow[previousStatus]?.includes(status)) {
        await connection.rollback();
        return res.status(400).json({ error: `Invalid status transition from ${previousStatus} to ${status}` });
      }
      
      // Update order status
      const updateData = { status };
      if (status === 'shipped') {
        updateData.shippedDate = new Date();
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
      }
      if (status === 'delivered') {
        updateData.deliveredDate = new Date();
      }
      if (status === 'invoiced') {
        updateData.invoicedDate = new Date();
        if (invoiceNumber) updateData.invoiceNumber = invoiceNumber;
      }
      if (status === 'paid') {
        updateData.paidDate = new Date();
        updateData.paymentStatus = 'paid';
      }
      if (status === 'cancelled') {
        updateData.cancelledBy = changedBy || null;
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = notes || 'Order cancelled';
        updateData.paymentStatus = 'refunded';
      }
      if (status === 'returned') {
        updateData.returnedAt = new Date();
        updateData.returnReason = notes || 'Order returned';
        updateData.paymentStatus = 'refunded';
      }
      
      const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateData);
      updateValues.push(id);
      
      await connection.execute(
        `UPDATE customer_orders SET ${updateFields} WHERE id = ?`,
        updateValues
      );
      
      // Insert status history
      await connection.execute(
        `INSERT INTO order_status_history (orderId, orderType, status, previousStatus, changedBy, notes, metadata)
         VALUES (?, 'customer_order', ?, ?, ?, ?, ?)`,
        [id, status, previousStatus, changedBy || null, notes || null, JSON.stringify({ trackingNumber, invoiceNumber, timestamp: new Date() })]
      );
      
      // If cancelled, create cancellation record and debit stock back
      if (status === 'cancelled') {
        await connection.execute(
          `INSERT INTO order_cancellations (orderId, orderType, reason, cancelledBy, refundAmount, refundStatus)
           VALUES (?, 'customer_order', ?, ?, ?, 'pending')`,
          [id, notes || 'Order cancelled', changedBy || null, currentOrder.finalAmount]
        );
        
        // TODO: Add stock back to inventory if order was confirmed/packed/shipped
      }
      
      await connection.commit();
      
      // Fetch updated order
      const [updatedOrder] = await pool.execute(`
        SELECT co.*, 
          u.name as userName, u.email as userEmail, u.phone as userPhone,
          w.name as warehouseName, w.code as warehouseCode
        FROM customer_orders co
        LEFT JOIN users u ON co.userId = u.id
        LEFT JOIN warehouses w ON co.warehouseId = w.id
        WHERE co.id = ?
      `, [id]);
      
      res.json(updatedOrder[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Order Returns
api.get('/order-returns', async (req, res) => {
  try {
    const { orderId, returnStatus } = req.query;
    let query = `
      SELECT or.*, co.orderNumber, p.name as productName, p.image as productImage
      FROM order_returns or
      JOIN customer_orders co ON or.orderId = co.id
      JOIN products p ON or.productId = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (orderId) {
      query += ' AND or.orderId = ?';
      params.push(parseInt(orderId));
    }
    
    if (returnStatus) {
      query += ' AND or.returnStatus = ?';
      params.push(returnStatus);
    }
    
    query += ' ORDER BY or.returnedAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching order returns:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/order-returns', async (req, res) => {
  try {
    const { orderId, orderItemId, productId, quantity, reason, returnType, returnedBy } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get order item to calculate refund
      const [orderItems] = await connection.execute(
        'SELECT * FROM order_items WHERE id = ? AND orderId = ?',
        [orderItemId, orderId]
      );
      
      if (orderItems.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Order item not found' });
      }
      
      const orderItem = orderItems[0];
      const refundAmount = (orderItem.subtotal / orderItem.quantity) * quantity;
      
      // Create return record
      const [returnResult] = await connection.execute(
        `INSERT INTO order_returns (
          orderId, orderItemId, productId, quantity, reason, returnType, returnStatus,
          refundAmount, refundStatus, returnedBy, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, 'pending', ?, ?)`,
        [
          orderId,
          orderItemId || null,
          productId,
          quantity,
          reason,
          returnType || 'partial',
          refundAmount,
          returnedBy || null,
          req.body.notes || null
        ]
      );
      
      // Update order item returned quantity
      await connection.execute(
        'UPDATE order_items SET returnedQuantity = returnedQuantity + ? WHERE id = ?',
        [quantity, orderItemId]
      );
      
      // Update order status to returned if all items are returned
      const [allItems] = await connection.execute(
        'SELECT SUM(quantity) as totalQty, SUM(returnedQuantity) as totalReturned FROM order_items WHERE orderId = ?',
        [orderId]
      );
      
      if (allItems[0].totalReturned >= allItems[0].totalQty) {
        await connection.execute(
          `UPDATE customer_orders SET status = 'returned', returnedAt = NOW(), returnReason = ? WHERE id = ?`,
          [reason, orderId]
        );
        
        await connection.execute(
          `INSERT INTO order_status_history (orderId, orderType, status, previousStatus, changedBy, notes)
           VALUES (?, 'customer_order', 'returned', (SELECT status FROM customer_orders WHERE id = ?), ?, ?)`,
          [orderId, orderId, returnedBy || null, `Order returned: ${reason}`]
        );
      }
      
      await connection.commit();
      
      const [returnRecord] = await pool.execute(`
        SELECT or.*, co.orderNumber, p.name as productName, p.image as productImage
        FROM order_returns or
        JOIN customer_orders co ON or.orderId = co.id
        JOIN products p ON or.productId = p.id
        WHERE or.id = ?
      `, [returnResult.insertId]);
      
      res.status(201).json(returnRecord[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating order return:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/order-returns/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { returnStatus, processedBy, refundStatus, refundMethod, refundTransactionId, notes } = req.body;
    
    const validStatuses = ['requested', 'approved', 'rejected', 'processed', 'completed'];
    if (!validStatuses.includes(returnStatus)) {
      return res.status(400).json({ error: 'Invalid return status' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const updateData = { returnStatus };
      if (returnStatus === 'processed' || returnStatus === 'completed') {
        updateData.processedBy = processedBy || null;
        updateData.processedAt = new Date();
      }
      if (refundStatus) {
        updateData.refundStatus = refundStatus;
      }
      if (refundMethod) {
        updateData.refundMethod = refundMethod;
      }
      if (refundTransactionId) {
        updateData.refundTransactionId = refundTransactionId;
      }
      if (notes) {
        updateData.notes = notes;
      }
      
      const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateData);
      updateValues.push(id);
      
      await connection.execute(
        `UPDATE order_returns SET ${updateFields} WHERE id = ?`,
        updateValues
      );
      
      await connection.commit();
      
      const [updatedReturn] = await pool.execute(`
        SELECT or.*, co.orderNumber, p.name as productName, p.image as productImage
        FROM order_returns or
        JOIN customer_orders co ON or.orderId = co.id
        JOIN products p ON or.productId = p.id
        WHERE or.id = ?
      `, [id]);
      
      res.json(updatedReturn[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating return status:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Pricing / Scheme Engine API Endpoints

// Discount Rules
api.get('/discount-rules', async (req, res) => {
  try {
    const { isActive, ruleType, applicableTo } = req.query;
    let query = 'SELECT * FROM discount_rules WHERE 1=1';
    const params = [];
    
    if (isActive !== undefined) {
      query += ' AND isActive = ?';
      params.push(isActive === 'true');
    }
    
    if (ruleType) {
      query += ' AND ruleType = ?';
      params.push(ruleType);
    }
    
    if (applicableTo) {
      query += ' AND applicableTo = ?';
      params.push(applicableTo);
    }
    
    query += ' ORDER BY priority DESC, createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching discount rules:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/discount-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM discount_rules WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching discount rule:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/discount-rules', async (req, res) => {
  try {
    const data = req.body;
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO discount_rules (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM discount_rules WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating discount rule:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/discount-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE discount_rules SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM discount_rules WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating discount rule:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/discount-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM discount_rules WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount rule:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Slab Pricing
api.get('/slab-pricing', async (req, res) => {
  try {
    const { productId, categoryId, isActive } = req.query;
    let query = 'SELECT * FROM slab_pricing WHERE 1=1';
    const params = [];
    
    if (productId) {
      query += ' AND productId = ?';
      params.push(parseInt(productId));
    }
    
    if (categoryId) {
      query += ' AND categoryId = ?';
      params.push(parseInt(categoryId));
    }
    
    if (isActive !== undefined) {
      query += ' AND isActive = ?';
      params.push(isActive === 'true');
    }
    
    query += ' ORDER BY priority DESC, minQuantity ASC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching slab pricing:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/slab-pricing', async (req, res) => {
  try {
    const data = req.body;
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO slab_pricing (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM slab_pricing WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating slab pricing:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/slab-pricing/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE slab_pricing SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM slab_pricing WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating slab pricing:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/slab-pricing/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM slab_pricing WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting slab pricing:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Promo Codes
api.get('/promo-codes', async (req, res) => {
  try {
    const { isActive, code } = req.query;
    let query = 'SELECT * FROM promo_codes WHERE 1=1';
    const params = [];
    
    if (isActive !== undefined) {
      query += ' AND isActive = ?';
      params.push(isActive === 'true');
    }
    
    if (code) {
      query += ' AND code = ?';
      params.push(code);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/promo-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM promo_codes WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching promo code:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/promo-codes', async (req, res) => {
  try {
    const data = req.body;
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO promo_codes (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM promo_codes WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/promo-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE promo_codes SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM promo_codes WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/promo-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM promo_codes WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/promo-codes/validate', async (req, res) => {
  try {
    const { code, userId, orderAmount, productIds, categoryIds } = req.body;
    
    const [promoCodes] = await pool.execute(
      'SELECT * FROM promo_codes WHERE code = ? AND isActive = TRUE',
      [code.toUpperCase()]
    );
    
    if (promoCodes.length === 0) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }
    
    const promoCode = promoCodes[0];
    const now = new Date();
    const startDate = new Date(promoCode.startDate);
    const endDate = new Date(promoCode.endDate);
    
    if (now < startDate || now > endDate) {
      return res.status(400).json({ error: 'Promo code expired or not yet active' });
    }
    
    if (promoCode.minPurchaseAmount > orderAmount) {
      return res.status(400).json({ error: `Minimum purchase amount of ₹${promoCode.minPurchaseAmount} required` });
    }
    
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return res.status(400).json({ error: 'Promo code usage limit exceeded' });
    }
    
    if (userId && promoCode.maxUsesPerUser) {
      const [usage] = await pool.execute(
        'SELECT COUNT(*) as count FROM promo_code_usage WHERE promoCodeId = ? AND userId = ?',
        [promoCode.id, userId]
      );
      
      if (usage[0].count >= promoCode.maxUsesPerUser) {
        return res.status(400).json({ error: 'You have reached the maximum usage limit for this promo code' });
      }
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discountType === 'percentage') {
      discountAmount = (orderAmount * promoCode.discountValue) / 100;
      if (promoCode.maxDiscountAmount && discountAmount > promoCode.maxDiscountAmount) {
        discountAmount = promoCode.maxDiscountAmount;
      }
    } else if (promoCode.discountType === 'fixed') {
      discountAmount = promoCode.discountValue;
    }
    
    res.json({
      valid: true,
      promoCode: promoCode,
      discountAmount: discountAmount
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Tax Rules (GST)
api.get('/tax-rules', async (req, res) => {
  try {
    const { isActive, taxType, applicableTo } = req.query;
    let query = 'SELECT * FROM tax_rules WHERE 1=1';
    const params = [];
    
    if (isActive !== undefined) {
      query += ' AND isActive = ?';
      params.push(isActive === 'true');
    }
    
    if (taxType) {
      query += ' AND taxType = ?';
      params.push(taxType);
    }
    
    if (applicableTo) {
      query += ' AND applicableTo = ?';
      params.push(applicableTo);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tax rules:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/tax-rules', async (req, res) => {
  try {
    const data = req.body;
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO tax_rules (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM tax_rules WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating tax rule:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/tax-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE tax_rules SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM tax_rules WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating tax rule:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/tax-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM tax_rules WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tax rule:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Credit Limits
api.get('/credit-limits', async (req, res) => {
  try {
    const { userId, userType, isActive } = req.query;
    let query = 'SELECT cl.*, u.name as userName, u.email as userEmail FROM credit_limits cl LEFT JOIN users u ON cl.userId = u.id WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND cl.userId = ?';
      params.push(parseInt(userId));
    }
    
    if (userType) {
      query += ' AND cl.userType = ?';
      params.push(userType);
    }
    
    if (isActive !== undefined) {
      query += ' AND cl.isActive = ?';
      params.push(isActive === 'true');
    }
    
    query += ' ORDER BY cl.createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching credit limits:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/credit-limits/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const [rows] = await pool.execute(
      'SELECT cl.*, u.name as userName, u.email as userEmail FROM credit_limits cl LEFT JOIN users u ON cl.userId = u.id WHERE cl.userId = ?',
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching credit limit:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/credit-limits', async (req, res) => {
  try {
    const data = req.body;
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO credit_limits (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute(
      'SELECT cl.*, u.name as userName, u.email as userEmail FROM credit_limits cl LEFT JOIN users u ON cl.userId = u.id WHERE cl.id = ?',
      [result.insertId]
    );
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating credit limit:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/credit-limits/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE credit_limits SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute(
      'SELECT cl.*, u.name as userName, u.email as userEmail FROM credit_limits cl LEFT JOIN users u ON cl.userId = u.id WHERE cl.id = ?',
      [id]
    );
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating credit limit:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/credit-limits/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM credit_limits WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit limit:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Payment Terms
api.get('/payment-terms', async (req, res) => {
  try {
    const { isActive } = req.query;
    let query = 'SELECT * FROM payment_terms WHERE 1=1';
    const params = [];
    
    if (isActive !== undefined) {
      query += ' AND isActive = ?';
      params.push(isActive === 'true');
    }
    
    query += ' ORDER BY paymentDays ASC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/payment-terms', async (req, res) => {
  try {
    const data = req.body;
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO payment_terms (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [newItem] = await pool.execute('SELECT * FROM payment_terms WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating payment term:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.put('/payment-terms/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    delete data.id;
    
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);
    values.push(id);
    
    await pool.execute(`UPDATE payment_terms SET ${setClause} WHERE id = ?`, values);
    
    const [updated] = await pool.execute('SELECT * FROM payment_terms WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Not found' });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating payment term:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.delete('/payment-terms/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.execute('DELETE FROM payment_terms WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment term:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Pricing Calculation Engine
api.post('/pricing/calculate', async (req, res) => {
  try {
    const { userId, items, promoCode, stateCode } = req.body;
    
    let totalAmount = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    const calculationDetails = [];
    
    // Process each item
    for (const item of items) {
      const { productId, quantity, unitPrice, categoryId } = item;
      let itemPrice = unitPrice * quantity;
      let itemDiscount = 0;
      let itemTax = 0;
      const itemDetails = {
        productId,
        quantity,
        basePrice: itemPrice,
        discounts: [],
        tax: {}
      };
      
      // Apply slab pricing
      const [slabs] = await pool.execute(
        `SELECT * FROM slab_pricing 
         WHERE isActive = TRUE 
         AND (productId = ? OR categoryId = ? OR (productId IS NULL AND categoryId IS NULL))
         AND minQuantity <= ?
         AND (maxQuantity IS NULL OR maxQuantity >= ?)
         ORDER BY priority DESC, minQuantity DESC
         LIMIT 1`,
        [productId, categoryId, quantity, quantity]
      );
      
      if (slabs.length > 0) {
        const slab = slabs[0];
        if (slab.discountPercentage > 0) {
          itemDiscount = (itemPrice * slab.discountPercentage) / 100;
          itemDetails.discounts.push({
            type: 'slab',
            amount: itemDiscount,
            slabId: slab.id
          });
        } else if (slab.price) {
          itemDiscount = itemPrice - (slab.price * quantity);
          itemDetails.discounts.push({
            type: 'slab',
            amount: itemDiscount,
            slabId: slab.id
          });
        }
      }
      
      // Apply discount rules
      const [discountRules] = await pool.execute(
        `SELECT * FROM discount_rules 
         WHERE isActive = TRUE 
         AND (applicableTo = 'all' OR (applicableTo = 'product' AND applicableToId = ?) OR (applicableTo = 'category' AND applicableToId = ?))
         AND (startDate IS NULL OR startDate <= CURDATE())
         AND (endDate IS NULL OR endDate >= CURDATE())
         ORDER BY priority DESC
         LIMIT 5`,
        [productId, categoryId]
      );
      
      for (const rule of discountRules) {
        if (rule.ruleType === 'percentage') {
          const discount = (itemPrice * rule.discountValue) / 100;
          if (rule.maxDiscountAmount && discount > rule.maxDiscountAmount) {
            itemDiscount += rule.maxDiscountAmount;
          } else {
            itemDiscount += discount;
          }
          itemDetails.discounts.push({
            type: 'discount_rule',
            amount: discount,
            ruleId: rule.id
          });
        } else if (rule.ruleType === 'fixed') {
          itemDiscount += rule.discountValue;
          itemDetails.discounts.push({
            type: 'discount_rule',
            amount: rule.discountValue,
            ruleId: rule.id
          });
        }
      }
      
      const itemPriceAfterDiscount = itemPrice - itemDiscount;
      
      // Apply tax (GST)
      const [taxRules] = await pool.execute(
        `SELECT * FROM tax_rules 
         WHERE isActive = TRUE 
         AND (applicableTo = 'all' OR (applicableTo = 'product' AND applicableToId = ?) OR (applicableTo = 'category' AND applicableToId = ?) OR (applicableTo = 'state' AND stateCode = ?))
         AND (effectiveFrom IS NULL OR effectiveFrom <= CURDATE())
         AND (effectiveTo IS NULL OR effectiveTo >= CURDATE())
         ORDER BY priority DESC
         LIMIT 1`,
        [productId, categoryId, stateCode]
      );
      
      if (taxRules.length > 0) {
        const taxRule = taxRules[0];
        itemTax = (itemPriceAfterDiscount * taxRule.taxRate) / 100;
        itemDetails.tax = {
          type: taxRule.taxType,
          rate: taxRule.taxRate,
          amount: itemTax
        };
      }
      
      totalAmount += itemPrice;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
      
      calculationDetails.push({
        ...itemDetails,
        finalPrice: itemPriceAfterDiscount + itemTax
      });
    }
    
    // Apply promo code discount
    let promoDiscount = 0;
    if (promoCode) {
      const [promoCodes] = await pool.execute(
        'SELECT * FROM promo_codes WHERE code = ? AND isActive = TRUE',
        [promoCode.toUpperCase()]
      );
      
      if (promoCodes.length > 0) {
        const promo = promoCodes[0];
        const orderAmount = totalAmount - totalDiscount;
        
        if (orderAmount >= promo.minPurchaseAmount) {
          if (promo.discountType === 'percentage') {
            promoDiscount = (orderAmount * promo.discountValue) / 100;
            if (promo.maxDiscountAmount && promoDiscount > promo.maxDiscountAmount) {
              promoDiscount = promo.maxDiscountAmount;
            }
          } else if (promo.discountType === 'fixed') {
            promoDiscount = promo.discountValue;
          }
          
          totalDiscount += promoDiscount;
        }
      }
    }
    
    const finalAmount = totalAmount - totalDiscount + totalTax;
    
    res.json({
      totalAmount,
      totalDiscount,
      promoDiscount,
      totalTax,
      finalAmount,
      calculationDetails
    });
  } catch (error) {
    console.error('Error calculating pricing:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== SHIPMENTS & LOGISTICS ====================

// Get all shipments
api.get('/shipments', async (req, res) => {
  try {
    const { orderId, status, logisticsPartner } = req.query;
    let query = 'SELECT * FROM shipments WHERE 1=1';
    const params = [];
    
    if (orderId) {
      query += ' AND orderId = ?';
      params.push(orderId);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (logisticsPartner) {
      query += ' AND logisticsPartner = ?';
      params.push(logisticsPartner);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    // Parse JSON fields
    const parsedRows = rows.map(row => {
      const item = { ...row };
      const jsonFields = ['originAddress', 'destinationAddress', 'dimensions', 'labelData', 'partnerApiResponse'];
      jsonFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {}
        }
      });
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    // If table doesn't exist, return empty array instead of error
    if (error.message && error.message.includes("doesn't exist")) {
      console.log('Shipments table does not exist yet, returning empty array');
      res.json([]);
    } else {
      console.error('Error fetching shipments:', error);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Get single shipment
api.get('/shipments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM shipments WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    
    const item = rows[0];
    const jsonFields = ['originAddress', 'destinationAddress', 'dimensions', 'labelData', 'partnerApiResponse'];
    jsonFields.forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create shipment
api.post('/shipments', async (req, res) => {
  try {
    const {
      orderId,
      logisticsPartner,
      originAddress,
      destinationAddress,
      weight,
      dimensions,
      notes
    } = req.body;
    
    if (!orderId || !logisticsPartner || !originAddress || !destinationAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate shipment number
    const shipmentNumber = `SH${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Create shipment via logistics partner API
    const partnerResponse = await createShipmentWithPartner(
      logisticsPartner,
      {
        orderId,
        shipmentNumber,
        originAddress,
        destinationAddress,
        weight,
        dimensions
      }
    );
    
    const [result] = await pool.execute(
      `INSERT INTO shipments (
        orderId, shipmentNumber, logisticsPartner, trackingNumber, status,
        originAddress, destinationAddress, weight, dimensions, shippingCost,
        estimatedDeliveryDate, notes, labelUrl, labelData, partnerApiResponse
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        shipmentNumber,
        logisticsPartner,
        partnerResponse.trackingNumber || null,
        partnerResponse.status || 'created',
        JSON.stringify(originAddress),
        JSON.stringify(destinationAddress),
        weight || null,
        dimensions ? JSON.stringify(dimensions) : null,
        partnerResponse.shippingCost || null,
        partnerResponse.estimatedDeliveryDate || null,
        notes || null,
        partnerResponse.labelUrl || null,
        partnerResponse.labelData ? JSON.stringify(partnerResponse.labelData) : null,
        JSON.stringify(partnerResponse)
      ]
    );
    
    // Create initial tracking entry
    if (result.insertId) {
      await pool.execute(
        'INSERT INTO shipment_tracking (shipmentId, status, description, source) VALUES (?, ?, ?, ?)',
        [result.insertId, partnerResponse.status || 'created', 'Shipment created', 'system']
      );
    }
    
    const [newShipment] = await pool.execute('SELECT * FROM shipments WHERE id = ?', [result.insertId]);
    const shipment = newShipment[0];
    const jsonFields = ['originAddress', 'destinationAddress', 'dimensions', 'labelData', 'partnerApiResponse'];
    jsonFields.forEach(field => {
      if (shipment[field] && typeof shipment[field] === 'string') {
        try {
          shipment[field] = JSON.parse(shipment[field]);
        } catch (e) {}
      }
    });
    
    res.status(201).json(shipment);
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
});

// Update shipment
api.put('/shipments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      status,
      trackingNumber,
      estimatedDeliveryDate,
      actualDeliveryDate,
      notes
    } = req.body;
    
    const updates = [];
    const params = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (trackingNumber !== undefined) {
      updates.push('trackingNumber = ?');
      params.push(trackingNumber);
    }
    if (estimatedDeliveryDate !== undefined) {
      updates.push('estimatedDeliveryDate = ?');
      params.push(estimatedDeliveryDate);
    }
    if (actualDeliveryDate !== undefined) {
      updates.push('actualDeliveryDate = ?');
      params.push(actualDeliveryDate);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    await pool.execute(
      `UPDATE shipments SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    // Add tracking entry if status changed
    if (status) {
      await pool.execute(
        'INSERT INTO shipment_tracking (shipmentId, status, description, source) VALUES (?, ?, ?, ?)',
        [id, status, `Status updated to ${status}`, 'manual']
      );
    }
    
    const [updated] = await pool.execute('SELECT * FROM shipments WHERE id = ?', [id]);
    const shipment = updated[0];
    const jsonFields = ['originAddress', 'destinationAddress', 'dimensions', 'labelData', 'partnerApiResponse'];
    jsonFields.forEach(field => {
      if (shipment[field] && typeof shipment[field] === 'string') {
        try {
          shipment[field] = JSON.parse(shipment[field]);
        } catch (e) {}
      }
    });
    
    res.json(shipment);
  } catch (error) {
    console.error('Error updating shipment:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Generate shipping label
api.post('/shipments/:id/generate-label', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM shipments WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    
    const shipment = rows[0];
    
    // Generate label via partner API
    const labelResponse = await generateLabelWithPartner(
      shipment.logisticsPartner,
      shipment.trackingNumber || shipment.shipmentNumber
    );
    
    // Update shipment with label data
    await pool.execute(
      'UPDATE shipments SET labelUrl = ?, labelData = ? WHERE id = ?',
      [
        labelResponse.labelUrl || null,
        labelResponse.labelData ? JSON.stringify(labelResponse.labelData) : null,
        id
      ]
    );
    
    res.json({
      labelUrl: labelResponse.labelUrl,
      labelData: labelResponse.labelData,
      message: 'Label generated successfully'
    });
  } catch (error) {
    console.error('Error generating label:', error);
    res.status(500).json({ error: error.message || 'Failed to generate label' });
  }
});

// Get shipment tracking history
api.get('/shipments/:id/tracking', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(
      'SELECT * FROM shipment_tracking WHERE shipmentId = ? ORDER BY timestamp DESC',
      [id]
    );
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.metadata && typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata);
        } catch (e) {}
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update shipment tracking (manual or from webhook)
api.post('/shipments/:id/tracking', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, location, description, source = 'manual', metadata } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    await pool.execute(
      'INSERT INTO shipment_tracking (shipmentId, status, location, description, source, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [id, status, location || null, description || null, source, metadata ? JSON.stringify(metadata) : null]
    );
    
    // Update shipment status if provided
    if (status) {
      await pool.execute('UPDATE shipments SET status = ? WHERE id = ?', [status, id]);
    }
    
    res.json({ message: 'Tracking updated successfully' });
  } catch (error) {
    console.error('Error updating tracking:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Sync tracking from partner API
api.post('/shipments/:id/sync-tracking', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM shipments WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    
    const shipment = rows[0];
    
    // Fetch tracking from partner API
    const trackingData = await fetchTrackingFromPartner(
      shipment.logisticsPartner,
      shipment.trackingNumber || shipment.shipmentNumber
    );
    
    // Add tracking entries
    for (const tracking of trackingData.events || []) {
      await pool.execute(
        'INSERT INTO shipment_tracking (shipmentId, status, location, description, source, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          tracking.status,
          tracking.location || null,
          tracking.description || null,
          'partner_api',
          tracking.metadata ? JSON.stringify(tracking.metadata) : null,
          tracking.timestamp || new Date()
        ]
      );
    }
    
    // Update shipment status if available
    if (trackingData.currentStatus) {
      await pool.execute('UPDATE shipments SET status = ? WHERE id = ?', [trackingData.currentStatus, id]);
    }
    
    res.json({ message: 'Tracking synced successfully', events: trackingData.events?.length || 0 });
  } catch (error) {
    console.error('Error syncing tracking:', error);
    res.status(500).json({ error: error.message || 'Failed to sync tracking' });
  }
});

// Get logistics partners
api.get('/logistics-partners', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM logistics_partners ORDER BY name');
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.config && typeof item.config === 'string') {
        try {
          item.config = JSON.parse(item.config);
        } catch (e) {}
      }
      item.isActive = Boolean(item.isActive);
      return item;
    });
    res.json(parsedRows);
  } catch (error) {
    // If table doesn't exist, return empty array instead of error
    if (error.message && error.message.includes("doesn't exist")) {
      console.log('Logistics partners table does not exist yet, returning empty array');
      res.json([]);
    } else {
      console.error('Error fetching logistics partners:', error);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Update logistics partner
api.put('/logistics-partners/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { isActive, apiKey, apiSecret, config } = req.body;
    
    const updates = [];
    const params = [];
    
    if (isActive !== undefined) {
      updates.push('isActive = ?');
      params.push(isActive);
    }
    if (apiKey !== undefined) {
      updates.push('apiKey = ?');
      params.push(apiKey);
    }
    if (apiSecret !== undefined) {
      updates.push('apiSecret = ?');
      params.push(apiSecret);
    }
    if (config !== undefined) {
      updates.push('config = ?');
      params.push(JSON.stringify(config));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    await pool.execute(
      `UPDATE logistics_partners SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const [updated] = await pool.execute('SELECT * FROM logistics_partners WHERE id = ?', [id]);
    const partner = updated[0];
    if (partner.config && typeof partner.config === 'string') {
      try {
        partner.config = JSON.parse(partner.config);
      } catch (e) {}
    }
    partner.isActive = Boolean(partner.isActive);
    
    res.json(partner);
  } catch (error) {
    console.error('Error updating logistics partner:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Helper function to create shipment with partner API
async function createShipmentWithPartner(partnerName, shipmentData) {
  // Get partner config
  const [partners] = await pool.execute('SELECT * FROM logistics_partners WHERE name = ?', [partnerName]);
  if (partners.length === 0) {
    throw new Error(`Logistics partner ${partnerName} not found`);
  }
  
  const partner = partners[0];
  if (!partner.isActive) {
    throw new Error(`Logistics partner ${partnerName} is not active`);
  }
  
  // For Shadow (local partner), simulate API call
  if (partnerName === 'shadow') {
    return {
      trackingNumber: `SHADOW${Date.now()}${Math.floor(Math.random() * 10000)}`,
      status: 'created',
      shippingCost: calculateShippingCost(shipmentData),
      estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
      labelUrl: null,
      labelData: {
        shipmentNumber: shipmentData.shipmentNumber,
        barcode: `SHADOW${Date.now()}`
      }
    };
  }
  
  // For DHL and Delhivery, you would make actual API calls here
  // This is a placeholder for future integration
  if (partnerName === 'dhl' || partnerName === 'delhivery') {
    // In production, make actual API call to partner
    // const response = await axios.post(partner.apiEndpoint, {...}, {headers: {Authorization: `Bearer ${partner.apiKey}`}});
    throw new Error(`${partner.displayName} integration not yet implemented. Please use Shadow Logistics.`);
  }
  
  throw new Error(`Unknown logistics partner: ${partnerName}`);
}

// Helper function to generate label with partner API
async function generateLabelWithPartner(partnerName, trackingNumber) {
  const [partners] = await pool.execute('SELECT * FROM logistics_partners WHERE name = ?', [partnerName]);
  if (partners.length === 0) {
    throw new Error(`Logistics partner ${partnerName} not found`);
  }
  
  const partner = partners[0];
  
  if (partnerName === 'shadow') {
    // Generate label URL (in production, this would be a real PDF generation)
    const labelUrl = `/api/shipments/labels/${trackingNumber}.pdf`;
    return {
      labelUrl,
      labelData: {
        trackingNumber,
        barcode: trackingNumber,
        qrCode: trackingNumber,
        generatedAt: new Date().toISOString()
      }
    };
  }
  
  // For other partners, make actual API calls
  throw new Error(`${partner.displayName} label generation not yet implemented`);
}

// Helper function to fetch tracking from partner API
async function fetchTrackingFromPartner(partnerName, trackingNumber) {
  const [partners] = await pool.execute('SELECT * FROM logistics_partners WHERE name = ?', [partnerName]);
  if (partners.length === 0) {
    throw new Error(`Logistics partner ${partnerName} not found`);
  }
  
  const partner = partners[0];
  
  if (partnerName === 'shadow') {
    // Simulate tracking events
    const statuses = ['created', 'in_transit', 'out_for_delivery', 'delivered'];
    const currentStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      currentStatus,
      events: [
        {
          status: 'created',
          location: 'Origin Warehouse',
          description: 'Shipment created and ready for pickup',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          status: 'in_transit',
          location: 'Transit Hub',
          description: 'Shipment in transit',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        ...(currentStatus === 'out_for_delivery' || currentStatus === 'delivered' ? [{
          status: 'out_for_delivery',
          location: 'Local Distribution Center',
          description: 'Out for delivery',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
        }] : []),
        ...(currentStatus === 'delivered' ? [{
          status: 'delivered',
          location: 'Destination',
          description: 'Delivered successfully',
          timestamp: new Date()
        }] : [])
      ]
    };
  }
  
  // For other partners, make actual API calls
  throw new Error(`${partner.displayName} tracking not yet implemented`);
}

// Helper function to calculate shipping cost
function calculateShippingCost(shipmentData) {
  // Simple calculation based on weight and distance
  const baseCost = 50;
  const weightCost = (shipmentData.weight || 1) * 10;
  return baseCost + weightCost;
}

// ==================== ANALYTICS & BI ====================

// Event Ingestion - Track analytics events
api.post('/analytics/events', async (req, res) => {
  try {
    const { eventType, entityType, entityId, userId, properties } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }
    
    await pool.execute(
      'INSERT INTO analytics_events (eventType, entityType, entityId, userId, properties) VALUES (?, ?, ?, ?, ?)',
      [
        eventType,
        entityType || null,
        entityId || null,
        userId || null,
        properties ? JSON.stringify(properties) : null
      ]
    );
    
    res.status(201).json({ message: 'Event recorded successfully' });
  } catch (error) {
    console.error('Error recording analytics event:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Batch Event Ingestion
api.post('/analytics/events/batch', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }
    
    const values = events.map(event => [
      event.eventType,
      event.entityType || null,
      event.entityId || null,
      event.userId || null,
      event.properties ? JSON.stringify(event.properties) : null
    ]);
    
    await pool.execute(
      'INSERT INTO analytics_events (eventType, entityType, entityId, userId, properties) VALUES ?',
      [values]
    );
    
    res.status(201).json({ message: `${events.length} events recorded successfully` });
  } catch (error) {
    console.error('Error recording batch analytics events:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Analytics Dashboard Data
api.get('/analytics/dashboard/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, period } = req.query;
    
    let data = {};
    
    switch (type) {
      case 'sales':
        data = await getSalesDashboardData(startDate, endDate, period);
        break;
      case 'inventory':
        data = await getInventoryDashboardData(startDate, endDate, period);
        break;
      case 'orders':
        data = await getOrdersDashboardData(startDate, endDate, period);
        break;
      case 'receivables':
        data = await getReceivablesDashboardData(startDate, endDate, period);
        break;
      case 'overview':
        data = await getOverviewDashboardData(startDate, endDate, period);
        break;
      default:
        return res.status(400).json({ error: 'Invalid dashboard type' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Sales Dashboard Data
async function getSalesDashboardData(startDate, endDate, period = 'daily') {
  try {
    const dateFilter = startDate && endDate 
      ? `AND DATE(createdAt) BETWEEN '${startDate}' AND '${endDate}'`
      : startDate 
        ? `AND DATE(createdAt) >= '${startDate}'`
        : endDate
          ? `AND DATE(createdAt) <= '${endDate}'`
          : `AND DATE(createdAt) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    
    // Total Sales
    const [totalSales] = await pool.execute(
      `SELECT COALESCE(SUM(finalAmount), 0) as total, COUNT(*) as count 
       FROM orders 
       WHERE status IN ('completed', 'processing') ${dateFilter}`
    );
    
    // Sales Trend
    let groupBy = 'DATE(createdAt)';
    if (period === 'weekly') groupBy = 'YEARWEEK(createdAt)';
    if (period === 'monthly') groupBy = 'DATE_FORMAT(createdAt, "%Y-%m")';
    
    const [salesTrend] = await pool.execute(
      `SELECT ${groupBy} as period, COALESCE(SUM(finalAmount), 0) as amount, COUNT(*) as count
       FROM orders 
       WHERE status IN ('completed', 'processing') ${dateFilter}
       GROUP BY ${groupBy}
       ORDER BY period ASC`
    );
    
    // Top Products
    const [topProducts] = await pool.execute(
      `SELECT p.id, p.name, SUM(oi.quantity) as totalQuantity, SUM(oi.price * oi.quantity) as totalRevenue
       FROM orders o
       JOIN JSON_TABLE(o.items, '$[*]' COLUMNS (
         productId INT PATH '$.productId',
         quantity INT PATH '$.quantity',
         price DECIMAL(10,2) PATH '$.price'
       )) oi ON TRUE
       JOIN products p ON p.id = oi.productId
       WHERE o.status IN ('completed', 'processing') ${dateFilter}
       GROUP BY p.id, p.name
       ORDER BY totalRevenue DESC
       LIMIT 10`
    );
    
    // Sales by Category
    const [salesByCategory] = await pool.execute(
      `SELECT p.category, SUM(oi.price * oi.quantity) as totalRevenue, COUNT(DISTINCT o.id) as orderCount
       FROM orders o
       JOIN JSON_TABLE(o.items, '$[*]' COLUMNS (
         productId INT PATH '$.productId',
         quantity INT PATH '$.quantity',
         price DECIMAL(10,2) PATH '$.price'
       )) oi ON TRUE
       JOIN products p ON p.id = oi.productId
       WHERE o.status IN ('completed', 'processing') ${dateFilter}
       GROUP BY p.category
       ORDER BY totalRevenue DESC`
    );
    
    // Average Order Value
    const [avgOrderValue] = await pool.execute(
      `SELECT COALESCE(AVG(finalAmount), 0) as avgValue
       FROM orders 
       WHERE status IN ('completed', 'processing') ${dateFilter}`
    );
    
    return {
      totalSales: totalSales[0]?.total || 0,
      orderCount: totalSales[0]?.count || 0,
      salesTrend: salesTrend,
      topProducts: topProducts,
      salesByCategory: salesByCategory,
      averageOrderValue: avgOrderValue[0]?.avgValue || 0
    };
  } catch (error) {
    console.error('Error getting sales dashboard data:', error);
    // Return empty data structure on error
    return {
      totalSales: 0,
      orderCount: 0,
      salesTrend: [],
      topProducts: [],
      salesByCategory: [],
      averageOrderValue: 0
    };
  }
}

// Get Inventory Dashboard Data
async function getInventoryDashboardData(startDate, endDate, period = 'daily') {
  try {
    // Inventory Turnover
    const [turnover] = await pool.execute(
      `SELECT 
        p.id, p.name, p.category,
        COALESCE(SUM(oi.quantity), 0) as unitsSold,
        p.stockQuantity as currentStock,
        CASE 
          WHEN p.stockQuantity > 0 THEN COALESCE(SUM(oi.quantity), 0) / p.stockQuantity
          ELSE 0
        END as turnoverRatio
       FROM products p
       LEFT JOIN orders o ON o.status IN ('completed', 'processing')
       LEFT JOIN JSON_TABLE(o.items, '$[*]' COLUMNS (
         productId INT PATH '$.productId',
         quantity INT PATH '$.quantity'
       )) oi ON oi.productId = p.id
       WHERE p.stockQuantity > 0
       GROUP BY p.id, p.name, p.category, p.stockQuantity
       ORDER BY turnoverRatio DESC
       LIMIT 20`
    );
    
    // Stock Levels
    const [stockLevels] = await pool.execute(
      `SELECT 
        category,
        COUNT(*) as totalProducts,
        SUM(CASE WHEN stockQuantity = 0 THEN 1 ELSE 0 END) as outOfStock,
        SUM(CASE WHEN stockQuantity > 0 AND stockQuantity < 10 THEN 1 ELSE 0 END) as lowStock,
        SUM(stockQuantity) as totalStock,
        SUM(stockQuantity * price) as totalValue
       FROM products
       GROUP BY category`
    );
    
    // Low Stock Alerts
    const [lowStock] = await pool.execute(
      `SELECT id, name, category, stockQuantity, price
       FROM products
       WHERE stockQuantity > 0 AND stockQuantity < 10
       ORDER BY stockQuantity ASC
       LIMIT 20`
    );
    
    // Inventory Value
    const [inventoryValue] = await pool.execute(
      `SELECT 
        SUM(stockQuantity * price) as totalValue,
        COUNT(*) as totalProducts,
        SUM(CASE WHEN stockQuantity = 0 THEN 1 ELSE 0 END) as outOfStockCount
       FROM products`
    );
    
    return {
      inventoryTurnover: turnover,
      stockLevels: stockLevels,
      lowStockAlerts: lowStock,
      inventoryValue: inventoryValue[0] || { totalValue: 0, totalProducts: 0, outOfStockCount: 0 }
    };
  } catch (error) {
    console.error('Error getting inventory dashboard data:', error);
    return {
      inventoryTurnover: [],
      stockLevels: [],
      lowStockAlerts: [],
      inventoryValue: { totalValue: 0, totalProducts: 0, outOfStockCount: 0 }
    };
  }
}

// Get Orders Dashboard Data
async function getOrdersDashboardData(startDate, endDate, period = 'daily') {
  try {
    const dateFilter = startDate && endDate 
      ? `AND DATE(createdAt) BETWEEN '${startDate}' AND '${endDate}'`
      : startDate 
        ? `AND DATE(createdAt) >= '${startDate}'`
        : endDate
          ? `AND DATE(createdAt) <= '${endDate}'`
          : '';
    
    // Pending Orders
    const [pendingOrders] = await pool.execute(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(finalAmount), 0) as totalValue,
        AVG(finalAmount) as avgValue
       FROM orders
       WHERE status IN ('pending', 'processing') ${dateFilter}`
    );
    
    // Order Status Breakdown
    const [orderStatus] = await pool.execute(
      `SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(finalAmount), 0) as totalValue
       FROM orders
       WHERE 1=1 ${dateFilter}
       GROUP BY status`
    );
    
    // Order Trend
    let groupBy = 'DATE(createdAt)';
    if (period === 'weekly') groupBy = 'YEARWEEK(createdAt)';
    if (period === 'monthly') groupBy = 'DATE_FORMAT(createdAt, "%Y-%m")';
    
    const [orderTrend] = await pool.execute(
      `SELECT 
        ${groupBy} as period,
        COUNT(*) as count,
        COALESCE(SUM(finalAmount), 0) as totalValue
       FROM orders
       WHERE 1=1 ${dateFilter}
       GROUP BY ${groupBy}
       ORDER BY period ASC`
    );
    
    // Average Order Value Trend
    const [avgOrderTrend] = await pool.execute(
      `SELECT 
        ${groupBy} as period,
        AVG(finalAmount) as avgValue,
        COUNT(*) as count
       FROM orders
       WHERE status IN ('completed', 'processing') ${dateFilter}
       GROUP BY ${groupBy}
       ORDER BY period ASC`
    );
    
    return {
      pendingOrders: pendingOrders[0] || { count: 0, totalValue: 0, avgValue: 0 },
      orderStatus: orderStatus,
      orderTrend: orderTrend,
      averageOrderValueTrend: avgOrderTrend
    };
  } catch (error) {
    console.error('Error getting orders dashboard data:', error);
    return {
      pendingOrders: { count: 0, totalValue: 0, avgValue: 0 },
      orderStatus: [],
      orderTrend: [],
      averageOrderValueTrend: []
    };
  }
}

// Get Receivables Dashboard Data
async function getReceivablesDashboardData(startDate, endDate, period = 'daily') {
  try {
    const dateFilter = startDate && endDate 
      ? `AND DATE(createdAt) BETWEEN '${startDate}' AND '${endDate}'`
      : startDate 
        ? `AND DATE(createdAt) >= '${startDate}'`
        : endDate
          ? `AND DATE(createdAt) <= '${endDate}'`
          : '';
    
    // Aging Receivables
    const [agingReceivables] = await pool.execute(
      `SELECT 
        CASE
          WHEN DATEDIFF(CURDATE(), dueDate) <= 0 THEN 'Current'
          WHEN DATEDIFF(CURDATE(), dueDate) <= 30 THEN '1-30 Days'
          WHEN DATEDIFF(CURDATE(), dueDate) <= 60 THEN '31-60 Days'
          WHEN DATEDIFF(CURDATE(), dueDate) <= 90 THEN '61-90 Days'
          ELSE 'Over 90 Days'
        END as ageBucket,
        COUNT(*) as count,
        COALESCE(SUM(pendingAmount), 0) as totalAmount
       FROM outstanding
       WHERE status IN ('pending', 'partial')
       GROUP BY ageBucket
       ORDER BY 
         CASE ageBucket
           WHEN 'Current' THEN 1
           WHEN '1-30 Days' THEN 2
           WHEN '31-60 Days' THEN 3
           WHEN '61-90 Days' THEN 4
           ELSE 5
         END`
    );
    
    // Payment Status
    const [paymentStatus] = await pool.execute(
      `SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(pendingAmount), 0) as totalAmount
       FROM outstanding
       WHERE 1=1 ${dateFilter}
       GROUP BY status`
    );
    
    // Collection Trend
    let groupBy = 'DATE(paymentDate)';
    if (period === 'weekly') groupBy = 'YEARWEEK(paymentDate)';
    if (period === 'monthly') groupBy = 'DATE_FORMAT(paymentDate, "%Y-%m")';
    
    const [collectionTrend] = await pool.execute(
      `SELECT 
        ${groupBy} as period,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as totalCollected
       FROM outstanding_history
       WHERE status = 'completed' ${dateFilter}
       GROUP BY ${groupBy}
       ORDER BY period ASC`
    );
    
    // Outstanding Summary
    const [outstandingSummary] = await pool.execute(
      `SELECT 
        COALESCE(SUM(pendingAmount), 0) as totalOutstanding,
        COUNT(*) as totalInvoices,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN pendingAmount ELSE 0 END), 0) as pendingAmount,
        COALESCE(SUM(CASE WHEN status = 'partial' THEN pendingAmount ELSE 0 END), 0) as partialAmount,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN pendingAmount ELSE 0 END), 0) as overdueAmount
       FROM outstanding
       WHERE status IN ('pending', 'partial', 'overdue')`
    );
    
    return {
      agingReceivables: agingReceivables,
      paymentStatus: paymentStatus,
      collectionTrend: collectionTrend,
      outstandingSummary: outstandingSummary[0] || {
        totalOutstanding: 0,
        totalInvoices: 0,
        pendingAmount: 0,
        partialAmount: 0,
        overdueAmount: 0
      }
    };
  } catch (error) {
    console.error('Error getting receivables dashboard data:', error);
    return {
      agingReceivables: [],
      paymentStatus: [],
      collectionTrend: [],
      outstandingSummary: {
        totalOutstanding: 0,
        totalInvoices: 0,
        pendingAmount: 0,
        partialAmount: 0,
        overdueAmount: 0
      }
    };
  }
}

// Get Overview Dashboard Data
async function getOverviewDashboardData(startDate, endDate, period = 'daily') {
  try {
    const salesData = await getSalesDashboardData(startDate, endDate, period);
    const ordersData = await getOrdersDashboardData(startDate, endDate, period);
    const receivablesData = await getReceivablesDashboardData(startDate, endDate, period);
    const inventoryData = await getInventoryDashboardData(startDate, endDate, period);
    
    return {
      sales: {
        total: salesData.totalSales,
        orderCount: salesData.orderCount,
        averageOrderValue: salesData.averageOrderValue
      },
      orders: {
        pending: ordersData.pendingOrders.count,
        pendingValue: ordersData.pendingOrders.totalValue
      },
      receivables: {
        totalOutstanding: receivablesData.outstandingSummary.totalOutstanding,
        overdue: receivablesData.outstandingSummary.overdueAmount
      },
      inventory: {
        totalValue: inventoryData.inventoryValue.totalValue,
        lowStockCount: inventoryData.lowStockAlerts.length,
        outOfStockCount: inventoryData.inventoryValue.outOfStockCount
      }
    };
  } catch (error) {
    console.error('Error getting overview dashboard data:', error);
    return {
      sales: { total: 0, orderCount: 0, averageOrderValue: 0 },
      orders: { pending: 0, pendingValue: 0 },
      receivables: { totalOutstanding: 0, overdue: 0 },
      inventory: { totalValue: 0, lowStockCount: 0, outOfStockCount: 0 }
    };
  }
}

// Get Analytics Events
api.get('/analytics/events', async (req, res) => {
  try {
    const { eventType, entityType, startDate, endDate, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM analytics_events WHERE 1=1';
    const params = [];
    
    if (eventType) {
      query += ' AND eventType = ?';
      params.push(eventType);
    }
    if (entityType) {
      query += ' AND entityType = ?';
      params.push(entityType);
    }
    if (startDate) {
      query += ' AND DATE(timestamp) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(timestamp) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit, 10));
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.properties && typeof item.properties === 'string') {
        try {
          item.properties = JSON.parse(item.properties);
        } catch (e) {}
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    if (error.message && error.message.includes("doesn't exist")) {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Audit Events API
api.get('/audit-events', async (req, res) => {
  try {
    const { user, action, resource, resource_id, startDate, endDate, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM audit_events WHERE 1=1';
    const params = [];
    
    if (user) {
      query += ' AND user = ?';
      params.push(user);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (resource) {
      query += ' AND resource = ?';
      params.push(resource);
    }
    if (resource_id) {
      query += ' AND resource_id = ?';
      params.push(resource_id);
    }
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.execute(query, params);
    
    // Parse JSON fields
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.details && typeof item.details === 'string') {
        try {
          item.details = JSON.parse(item.details);
        } catch (e) {
          item.details = null;
        }
      }
      return item;
    });
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM audit_events WHERE 1=1';
    const countParams = [];
    
    if (user) {
      countQuery += ' AND user = ?';
      countParams.push(user);
    }
    if (action) {
      countQuery += ' AND action = ?';
      countParams.push(action);
    }
    if (resource) {
      countQuery += ' AND resource = ?';
      countParams.push(resource);
    }
    if (resource_id) {
      countQuery += ' AND resource_id = ?';
      countParams.push(resource_id);
    }
    if (startDate) {
      countQuery += ' AND timestamp >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND timestamp <= ?';
      countParams.push(endDate);
    }
    
    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;
    
    res.json({
      events: parsedRows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching audit events:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.get('/audit-events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM audit_events WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Audit event not found' });
    }
    
    const event = { ...rows[0] };
    if (event.details && typeof event.details === 'string') {
      try {
        event.details = JSON.parse(event.details);
      } catch (e) {
        event.details = null;
      }
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching audit event:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

api.post('/audit-events', async (req, res) => {
  try {
    const { user, action, resource, resource_id, details, ip_address, user_agent } = req.body;
    
    if (!user || !action || !resource) {
      return res.status(400).json({ error: 'user, action, and resource are required' });
    }
    
    const detailsJson = details ? JSON.stringify(details) : null;
    
    const [result] = await pool.execute(
      'INSERT INTO audit_events (user, action, resource, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user, action, resource, resource_id || null, detailsJson, ip_address || null, user_agent || null]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'Audit event created successfully'
    });
  } catch (error) {
    console.error('Error creating audit event:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get unique values for filters
api.get('/audit-events/filters/unique', async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT DISTINCT user FROM audit_events ORDER BY user');
    const [actions] = await pool.execute('SELECT DISTINCT action FROM audit_events ORDER BY action');
    const [resources] = await pool.execute('SELECT DISTINCT resource FROM audit_events ORDER BY resource');
    
    res.json({
      users: users.map(r => r.user),
      actions: actions.map(r => r.action),
      resources: resources.map(r => r.resource)
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.use('/api', api);

// Auto-create catalog tables if they don't exist
async function createCatalogTables() {
  try {
    // Create product_skus table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS product_skus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        sku VARCHAR(100) NOT NULL UNIQUE,
        variantName VARCHAR(255),
        variantValue VARCHAR(255),
        price DECIMAL(10, 2),
        stockQuantity INT DEFAULT 0,
        barcode VARCHAR(100),
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_productId (productId),
        INDEX idx_sku (sku),
        INDEX idx_barcode (barcode)
      )
    `);

    // Create price_tiers table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS price_tiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        tierName VARCHAR(100) NOT NULL,
        minQuantity INT NOT NULL,
        maxQuantity INT,
        price DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(5, 2) DEFAULT 0,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_productId (productId),
        INDEX idx_minQuantity (minQuantity)
      )
    `);

    // Create unit_conversions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS unit_conversions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        fromUnit VARCHAR(50) NOT NULL,
        toUnit VARCHAR(50) NOT NULL,
        conversionFactor DECIMAL(10, 4) NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_productId (productId),
        UNIQUE KEY unique_conversion (productId, fromUnit, toUnit)
      )
    `);

    // Create substitute_products table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS substitute_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        substituteProductId INT NOT NULL,
        priority INT DEFAULT 0,
        reason TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (substituteProductId) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_productId (productId),
        INDEX idx_substituteProductId (substituteProductId),
        UNIQUE KEY unique_substitute (productId, substituteProductId)
      )
    `);

    // Create product_search_index table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS product_search_index (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        searchText TEXT NOT NULL,
        keywords JSON,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product (productId),
        FULLTEXT INDEX idx_searchText (searchText)
      )
    `);

    // Add sku column to products if it doesn't exist
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN sku VARCHAR(100) AFTER id');
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        console.log('SKU column may already exist or error:', error.message);
      }
    }

    try {
      await pool.execute('ALTER TABLE products ADD COLUMN searchKeywords TEXT AFTER description');
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        console.log('searchKeywords column may already exist or error:', error.message);
      }
    }

    try {
      await pool.execute('ALTER TABLE products ADD UNIQUE INDEX idx_sku (sku)');
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('SKU index may already exist or error:', error.message);
      }
    }

    console.log('Catalog tables initialized successfully');
  } catch (error) {
    console.error('Error creating catalog tables:', error);
  }
}

// Seed products on server start
seedProducts();

// Auto-create inventory tables if they don't exist
async function createInventoryTables() {
  try {
    // Create warehouses table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE NOT NULL,
        type ENUM('warehouse', 'shop', 'store') DEFAULT 'warehouse',
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        contactPerson VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_type (type),
        INDEX idx_isActive (isActive)
      )
    `);

    // Create stock_inventory table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        warehouseId INT NOT NULL,
        batchNumber VARCHAR(100),
        expiryDate DATE,
        quantity INT NOT NULL DEFAULT 0,
        reservedQuantity INT DEFAULT 0,
        availableQuantity INT GENERATED ALWAYS AS (quantity - reservedQuantity) STORED,
        costPrice DECIMAL(10, 2),
        sellingPrice DECIMAL(10, 2),
        stockMethod ENUM('FIFO', 'LIFO') DEFAULT 'FIFO',
        location VARCHAR(255),
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE,
        INDEX idx_productId (productId),
        INDEX idx_warehouseId (warehouseId),
        INDEX idx_batchNumber (batchNumber),
        INDEX idx_expiryDate (expiryDate),
        INDEX idx_stockMethod (stockMethod),
        INDEX idx_availableQuantity (availableQuantity)
      )
    `);

    // Create po_reservations table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS po_reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        poNumber VARCHAR(100) NOT NULL,
        productId INT NOT NULL,
        warehouseId INT NOT NULL,
        stockInventoryId INT,
        batchNumber VARCHAR(100),
        quantity INT NOT NULL,
        reservedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reservedBy INT,
        status ENUM('reserved', 'confirmed', 'cancelled', 'fulfilled') DEFAULT 'reserved',
        expiryDate DATE,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (stockInventoryId) REFERENCES stock_inventory(id) ON DELETE SET NULL,
        INDEX idx_poNumber (poNumber),
        INDEX idx_productId (productId),
        INDEX idx_warehouseId (warehouseId),
        INDEX idx_status (status),
        INDEX idx_reservedAt (reservedAt)
      )
    `);

    // Create stock_events table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        warehouseId INT,
        eventType ENUM('stock_low', 'stock_debited', 'stock_added', 'stock_reserved', 'stock_released', 'expiry_warning') NOT NULL,
        quantity INT,
        batchNumber VARCHAR(100),
        previousQuantity INT,
        currentQuantity INT,
        threshold INT,
        message TEXT,
        metadata JSON,
        isPublished BOOLEAN DEFAULT FALSE,
        publishedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL,
        INDEX idx_productId (productId),
        INDEX idx_warehouseId (warehouseId),
        INDEX idx_eventType (eventType),
        INDEX idx_isPublished (isPublished),
        INDEX idx_createdAt (createdAt)
      )
    `);

    // Create stock_transactions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        warehouseId INT NOT NULL,
        stockInventoryId INT,
        transactionType ENUM('in', 'out', 'adjustment', 'reservation', 'release', 'transfer') NOT NULL,
        quantity INT NOT NULL,
        batchNumber VARCHAR(100),
        referenceType VARCHAR(50),
        referenceId INT,
        notes TEXT,
        createdBy INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (stockInventoryId) REFERENCES stock_inventory(id) ON DELETE SET NULL,
        INDEX idx_productId (productId),
        INDEX idx_warehouseId (warehouseId),
        INDEX idx_transactionType (transactionType),
        INDEX idx_createdAt (createdAt)
      )
    `);

    console.log('Inventory tables initialized successfully');
  } catch (error) {
    console.error('Error creating inventory tables:', error);
  }
}

// Table creation moved to initializeTables() function

// Auto-create order tables if they don't exist
async function createOrderTables() {
  try {
    // Create purchase_orders table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        poNumber VARCHAR(100) UNIQUE NOT NULL,
        supplierId INT,
        supplierName VARCHAR(255),
        warehouseId INT NOT NULL,
        status ENUM('created', 'pending_approval', 'approved', 'confirmed', 'packed', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled') DEFAULT 'created',
        totalAmount DECIMAL(10, 2) DEFAULT 0,
        taxAmount DECIMAL(10, 2) DEFAULT 0,
        discountAmount DECIMAL(10, 2) DEFAULT 0,
        finalAmount DECIMAL(10, 2) DEFAULT 0,
        orderDate DATE NOT NULL,
        expectedDeliveryDate DATE,
        actualDeliveryDate DATE,
        approvedBy INT,
        approvedAt TIMESTAMP NULL,
        createdBy INT,
        notes TEXT,
        cancellationReason TEXT,
        cancelledBy INT,
        cancelledAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_poNumber (poNumber),
        INDEX idx_status (status),
        INDEX idx_warehouseId (warehouseId),
        INDEX idx_orderDate (orderDate)
      )
    `);
    
    // Add foreign key constraint if warehouses table exists
    try {
      await pool.execute(`
        ALTER TABLE purchase_orders 
        ADD CONSTRAINT fk_po_warehouse 
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE RESTRICT
      `);
    } catch (error) {
      // Foreign key might already exist, ignore
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for purchase_orders.warehouseId:', error.message);
      }
    }

    // Create po_items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS po_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        poId INT NOT NULL,
        productId INT NOT NULL,
        productName VARCHAR(255),
        sku VARCHAR(100),
        quantity INT NOT NULL,
        unitPrice DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0,
        taxRate DECIMAL(5, 2) DEFAULT 0,
        subtotal DECIMAL(10, 2) NOT NULL,
        batchNumber VARCHAR(100),
        expiryDate DATE,
        receivedQuantity INT DEFAULT 0,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_poId (poId),
        INDEX idx_productId (productId)
      )
    `);
    
    // Add foreign key constraints
    try {
      await pool.execute(`
        ALTER TABLE po_items 
        ADD CONSTRAINT fk_po_items_po 
        FOREIGN KEY (poId) REFERENCES purchase_orders(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for po_items.poId:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE po_items 
        ADD CONSTRAINT fk_po_items_product 
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for po_items.productId:', error.message);
      }
    }

    // Create customer_orders table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customer_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderNumber VARCHAR(100) UNIQUE NOT NULL,
        userId INT NOT NULL,
        distributorId INT,
        retailerId INT,
        warehouseId INT,
        status ENUM('created', 'confirmed', 'packed', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled', 'returned') DEFAULT 'created',
        orderType ENUM('retail', 'wholesale', 'b2b') DEFAULT 'retail',
        totalAmount DECIMAL(10, 2) DEFAULT 0,
        taxAmount DECIMAL(10, 2) DEFAULT 0,
        discountAmount DECIMAL(10, 2) DEFAULT 0,
        shippingAmount DECIMAL(10, 2) DEFAULT 0,
        finalAmount DECIMAL(10, 2) DEFAULT 0,
        paymentMethod VARCHAR(50),
        paymentStatus ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
        orderDate DATETIME NOT NULL,
        expectedDeliveryDate DATE,
        shippedDate DATETIME,
        deliveredDate DATETIME,
        invoicedDate DATETIME,
        paidDate DATETIME,
        shippingAddress TEXT,
        billingAddress TEXT,
        trackingNumber VARCHAR(100),
        invoiceNumber VARCHAR(100),
        cancellationReason TEXT,
        cancelledBy INT,
        cancelledAt TIMESTAMP NULL,
        returnReason TEXT,
        returnedAt TIMESTAMP NULL,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orderNumber (orderNumber),
        INDEX idx_userId (userId),
        INDEX idx_status (status),
        INDEX idx_orderDate (orderDate),
        INDEX idx_paymentStatus (paymentStatus)
      )
    `);
    
    // Add foreign key constraints
    try {
      await pool.execute(`
        ALTER TABLE customer_orders 
        ADD CONSTRAINT fk_co_user 
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for customer_orders.userId:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE customer_orders 
        ADD CONSTRAINT fk_co_warehouse 
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for customer_orders.warehouseId:', error.message);
      }
    }

    // Create order_items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT NOT NULL,
        productId INT NOT NULL,
        productName VARCHAR(255),
        sku VARCHAR(100),
        quantity INT NOT NULL,
        unitPrice DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0,
        taxRate DECIMAL(5, 2) DEFAULT 0,
        subtotal DECIMAL(10, 2) NOT NULL,
        batchNumber VARCHAR(100),
        expiryDate DATE,
        returnedQuantity INT DEFAULT 0,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orderId (orderId),
        INDEX idx_productId (productId)
      )
    `);
    
    // Add foreign key constraints
    try {
      await pool.execute(`
        ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_order 
        FOREIGN KEY (orderId) REFERENCES customer_orders(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for order_items.orderId:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_product 
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for order_items.productId:', error.message);
      }
    }

    // Create order_status_history table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT NOT NULL,
        orderType ENUM('purchase_order', 'customer_order') NOT NULL,
        status VARCHAR(50) NOT NULL,
        previousStatus VARCHAR(50),
        changedBy INT,
        changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        metadata JSON,
        INDEX idx_orderId (orderId),
        INDEX idx_orderType (orderType),
        INDEX idx_status (status),
        INDEX idx_changedAt (changedAt)
      )
    `);

    // Create order_cancellations table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS order_cancellations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT NOT NULL,
        orderType ENUM('purchase_order', 'customer_order') NOT NULL,
        reason TEXT NOT NULL,
        cancelledBy INT,
        cancelledAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        refundAmount DECIMAL(10, 2) DEFAULT 0,
        refundStatus ENUM('pending', 'processed', 'completed') DEFAULT 'pending',
        refundMethod VARCHAR(50),
        refundTransactionId VARCHAR(100),
        notes TEXT,
        INDEX idx_orderId (orderId),
        INDEX idx_orderType (orderType),
        INDEX idx_cancelledAt (cancelledAt)
      )
    `);

    // Create order_returns table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS order_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT NOT NULL,
        orderItemId INT,
        productId INT NOT NULL,
        quantity INT NOT NULL,
        reason TEXT NOT NULL,
        returnType ENUM('full', 'partial') DEFAULT 'partial',
        returnStatus ENUM('requested', 'approved', 'rejected', 'processed', 'completed') DEFAULT 'requested',
        refundAmount DECIMAL(10, 2) DEFAULT 0,
        refundStatus ENUM('pending', 'processed', 'completed') DEFAULT 'pending',
        returnedBy INT,
        returnedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processedBy INT,
        processedAt TIMESTAMP NULL,
        notes TEXT,
        INDEX idx_orderId (orderId),
        INDEX idx_orderItemId (orderItemId),
        INDEX idx_returnStatus (returnStatus),
        INDEX idx_returnedAt (returnedAt)
      )
    `);
    
    // Add foreign key constraints
    try {
      await pool.execute(`
        ALTER TABLE order_returns 
        ADD CONSTRAINT fk_returns_order 
        FOREIGN KEY (orderId) REFERENCES customer_orders(id) ON DELETE RESTRICT
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for order_returns.orderId:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE order_returns 
        ADD CONSTRAINT fk_returns_item 
        FOREIGN KEY (orderItemId) REFERENCES order_items(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for order_returns.orderItemId:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE order_returns 
        ADD CONSTRAINT fk_returns_product 
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        console.log('Warning: Could not add foreign key constraint for order_returns.productId:', error.message);
      }
    }

    console.log('Order tables initialized successfully');
  } catch (error) {
    console.error('Error creating order tables:', error);
  }
}

// Table creation moved to initializeTables() function

// Auto-create pricing tables if they don't exist
async function createPricingTables() {
  try {
    // Create discount_rules table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS discount_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        ruleType ENUM('percentage', 'fixed', 'buy_x_get_y', 'free_shipping') NOT NULL,
        discountValue DECIMAL(10, 2) NOT NULL,
        minPurchaseAmount DECIMAL(10, 2) DEFAULT 0,
        maxDiscountAmount DECIMAL(10, 2),
        applicableTo ENUM('all', 'category', 'product', 'user', 'user_group') DEFAULT 'all',
        applicableToId INT,
        startDate DATE,
        endDate DATE,
        maxUses INT,
        maxUsesPerUser INT,
        priority INT DEFAULT 0,
        isActive BOOLEAN DEFAULT TRUE,
        conditions JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ruleType (ruleType),
        INDEX idx_applicableTo (applicableTo),
        INDEX idx_isActive (isActive),
        INDEX idx_startDate (startDate),
        INDEX idx_endDate (endDate),
        INDEX idx_priority (priority)
      )
    `);

    // Create slab_pricing table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS slab_pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        productId INT,
        categoryId INT,
        minQuantity INT NOT NULL,
        maxQuantity INT,
        price DECIMAL(10, 2) NOT NULL,
        discountPercentage DECIMAL(5, 2) DEFAULT 0,
        isActive BOOLEAN DEFAULT TRUE,
        priority INT DEFAULT 0,
        conditions JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_productId (productId),
        INDEX idx_categoryId (categoryId),
        INDEX idx_minQuantity (minQuantity),
        INDEX idx_isActive (isActive),
        INDEX idx_priority (priority)
      )
    `);

    // Create promo_codes table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discountType ENUM('percentage', 'fixed', 'free_shipping') NOT NULL,
        discountValue DECIMAL(10, 2) NOT NULL,
        minPurchaseAmount DECIMAL(10, 2) DEFAULT 0,
        maxDiscountAmount DECIMAL(10, 2),
        applicableTo ENUM('all', 'category', 'product', 'user', 'user_group') DEFAULT 'all',
        applicableToId INT,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        maxUses INT,
        maxUsesPerUser INT,
        usedCount INT DEFAULT 0,
        isActive BOOLEAN DEFAULT TRUE,
        conditions JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_isActive (isActive),
        INDEX idx_startDate (startDate),
        INDEX idx_endDate (endDate)
      )
    `);

    // Create promo_code_usage table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS promo_code_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        promoCodeId INT NOT NULL,
        userId INT NOT NULL,
        orderId INT,
        orderNumber VARCHAR(100),
        discountAmount DECIMAL(10, 2) NOT NULL,
        usedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_promoCodeId (promoCodeId),
        INDEX idx_userId (userId),
        INDEX idx_orderId (orderId),
        INDEX idx_usedAt (usedAt)
      )
    `);

    // Create tax_rules table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tax_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        taxType ENUM('GST', 'VAT', 'CST', 'SGST', 'CGST', 'IGST') DEFAULT 'GST',
        taxRate DECIMAL(5, 2) NOT NULL,
        applicableTo ENUM('all', 'category', 'product', 'state') DEFAULT 'all',
        applicableToId INT,
        stateCode VARCHAR(10),
        hsnCode VARCHAR(50),
        isActive BOOLEAN DEFAULT TRUE,
        effectiveFrom DATE,
        effectiveTo DATE,
        conditions JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_taxType (taxType),
        INDEX idx_applicableTo (applicableTo),
        INDEX idx_isActive (isActive),
        INDEX idx_hsnCode (hsnCode),
        INDEX idx_stateCode (stateCode)
      )
    `);

    // Create credit_limits table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS credit_limits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        userType ENUM('retailer', 'distributor', 'customer') NOT NULL,
        creditLimit DECIMAL(10, 2) NOT NULL,
        usedCredit DECIMAL(10, 2) DEFAULT 0,
        availableCredit DECIMAL(10, 2) GENERATED ALWAYS AS (creditLimit - usedCredit) STORED,
        paymentTerms INT DEFAULT 0,
        gracePeriod INT DEFAULT 0,
        interestRate DECIMAL(5, 2) DEFAULT 0,
        isActive BOOLEAN DEFAULT TRUE,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_userId (userId),
        INDEX idx_userType (userType),
        INDEX idx_isActive (isActive)
      )
    `);

    // Create payment_terms table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payment_terms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        paymentDays INT NOT NULL,
        gracePeriod INT DEFAULT 0,
        interestRate DECIMAL(5, 2) DEFAULT 0,
        lateFeePercentage DECIMAL(5, 2) DEFAULT 0,
        applicableTo ENUM('all', 'user', 'user_group', 'order_type') DEFAULT 'all',
        applicableToId INT,
        isActive BOOLEAN DEFAULT TRUE,
        conditions JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_paymentDays (paymentDays),
        INDEX idx_applicableTo (applicableTo),
        INDEX idx_isActive (isActive)
      )
    `);

    // Create pricing_calculations table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pricing_calculations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT,
        userId INT,
        productId INT,
        basePrice DECIMAL(10, 2) NOT NULL,
        discountAmount DECIMAL(10, 2) DEFAULT 0,
        slabDiscountAmount DECIMAL(10, 2) DEFAULT 0,
        promoCodeId INT,
        promoDiscountAmount DECIMAL(10, 2) DEFAULT 0,
        taxAmount DECIMAL(10, 2) DEFAULT 0,
        taxRate DECIMAL(5, 2) DEFAULT 0,
        finalPrice DECIMAL(10, 2) NOT NULL,
        calculationDetails JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_orderId (orderId),
        INDEX idx_userId (userId),
        INDEX idx_productId (productId),
        INDEX idx_createdAt (createdAt)
      )
    `);

    console.log('Pricing tables initialized successfully');
  } catch (error) {
    console.error('Error creating pricing tables:', error);
  }
}

// Table creation moved to initializeTables() function

// Create payment tables on server start
async function createPaymentTables() {
  try {
    // Read and execute payment schema
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const schemaPath = path.join(__dirname, 'schema_payments.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(s => s.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await pool.execute(statement);
          } catch (error) {
            if (!error.message.includes('already exists')) {
              console.error('Error creating payment table:', error.message);
            }
          }
        }
      }
      console.log('Payment tables initialized successfully');
    }
  } catch (error) {
    console.error('Error creating payment tables:', error);
  }
}
// Table creation moved to initializeTables() function

// ==================== PAYMENT/FINANCE MODULE API ====================

// Helper function to generate unique payment numbers
function generatePaymentNumber(prefix = 'PAY') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

function generateRefundNumber() {
  return `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// ==================== PAYMENT GATEWAYS ====================

// Get all payment gateways
api.get('/payment-gateways', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, displayName, gatewayType, isActive, isTestMode, supportedPaymentMethods, supportedCurrencies, createdAt, updatedAt FROM payment_gateways ORDER BY name');
    
    // Parse JSON fields
    const parsedRows = rows.map(row => {
      const item = { ...row };
      ['supportedPaymentMethods', 'supportedCurrencies'].forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {}
        }
      });
      item.isActive = Boolean(item.isActive);
      item.isTestMode = Boolean(item.isTestMode);
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    // If table doesn't exist, return empty array instead of error
    if (error.message && error.message.includes("doesn't exist")) {
      res.json([]);
    } else {
      console.error('Error fetching payment gateways:', error);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Get payment gateway by ID
api.get('/payment-gateways/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM payment_gateways WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Payment gateway not found' });
    
    const item = rows[0];
    ['config', 'supportedPaymentMethods', 'supportedCurrencies', 'feeStructure'].forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    item.isActive = Boolean(item.isActive);
    item.isTestMode = Boolean(item.isTestMode);
    
    // Don't expose sensitive data in production
    if (item.apiKey) item.apiKey = '***';
    if (item.apiSecret) item.apiSecret = '***';
    if (item.webhookSecret) item.webhookSecret = '***';
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching payment gateway:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create payment gateway
api.post('/payment-gateways', async (req, res) => {
  try {
    const { name, displayName, gatewayType, isActive, isTestMode, apiKey, apiSecret, webhookSecret, merchantId, config, supportedPaymentMethods, supportedCurrencies, feeStructure } = req.body;
    
    const jsonFields = { config, supportedPaymentMethods, supportedCurrencies, feeStructure };
    const jsonValues = {};
    Object.keys(jsonFields).forEach(key => {
      jsonValues[key] = jsonFields[key] ? JSON.stringify(jsonFields[key]) : null;
    });
    
    const [result] = await pool.execute(
      `INSERT INTO payment_gateways (name, displayName, gatewayType, isActive, isTestMode, apiKey, apiSecret, webhookSecret, merchantId, config, supportedPaymentMethods, supportedCurrencies, feeStructure) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, displayName, gatewayType, isActive || true, isTestMode || true, apiKey || null, apiSecret || null, webhookSecret || null, merchantId || null, jsonValues.config, jsonValues.supportedPaymentMethods, jsonValues.supportedCurrencies, jsonValues.feeStructure]
    );
    
    const [newItem] = await pool.execute('SELECT * FROM payment_gateways WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    ['config', 'supportedPaymentMethods', 'supportedCurrencies', 'feeStructure'].forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    item.isActive = Boolean(item.isActive);
    item.isTestMode = Boolean(item.isTestMode);
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating payment gateway:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update payment gateway
api.put('/payment-gateways/:id', async (req, res) => {
  try {
    const { displayName, isActive, isTestMode, apiKey, apiSecret, webhookSecret, merchantId, config, supportedPaymentMethods, supportedCurrencies, feeStructure } = req.body;
    
    const updates = [];
    const values = [];
    
    if (displayName !== undefined) { updates.push('displayName = ?'); values.push(displayName); }
    if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive); }
    if (isTestMode !== undefined) { updates.push('isTestMode = ?'); values.push(isTestMode); }
    if (apiKey !== undefined) { updates.push('apiKey = ?'); values.push(apiKey); }
    if (apiSecret !== undefined) { updates.push('apiSecret = ?'); values.push(apiSecret); }
    if (webhookSecret !== undefined) { updates.push('webhookSecret = ?'); values.push(webhookSecret); }
    if (merchantId !== undefined) { updates.push('merchantId = ?'); values.push(merchantId); }
    if (config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(config)); }
    if (supportedPaymentMethods !== undefined) { updates.push('supportedPaymentMethods = ?'); values.push(JSON.stringify(supportedPaymentMethods)); }
    if (supportedCurrencies !== undefined) { updates.push('supportedCurrencies = ?'); values.push(JSON.stringify(supportedCurrencies)); }
    if (feeStructure !== undefined) { updates.push('feeStructure = ?'); values.push(JSON.stringify(feeStructure)); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    await pool.execute(`UPDATE payment_gateways SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.execute('SELECT * FROM payment_gateways WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Payment gateway not found' });
    
    const item = rows[0];
    ['config', 'supportedPaymentMethods', 'supportedCurrencies', 'feeStructure'].forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    item.isActive = Boolean(item.isActive);
    item.isTestMode = Boolean(item.isTestMode);
    
    res.json(item);
  } catch (error) {
    console.error('Error updating payment gateway:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete payment gateway
api.delete('/payment-gateways/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM payment_gateways WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }
    res.json({ message: 'Payment gateway deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment gateway:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== PAYMENT TOKENS ====================

// Get payment tokens for a user
api.get('/payment-tokens', async (req, res) => {
  try {
    const { userId } = req.query;
    let query = 'SELECT * FROM payment_tokens WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY isDefault DESC, createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.metadata && typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata);
        } catch (e) {}
      }
      item.isDefault = Boolean(item.isDefault);
      item.isActive = Boolean(item.isActive);
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching payment tokens:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create payment token (tokenization)
api.post('/payment-tokens', async (req, res) => {
  try {
    const { userId, gatewayId, token, tokenType, maskedCardNumber, cardBrand, expiryMonth, expiryYear, cardHolderName, isDefault, metadata } = req.body;
    
    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await pool.execute('UPDATE payment_tokens SET isDefault = FALSE WHERE userId = ?', [userId]);
    }
    
    const [result] = await pool.execute(
      `INSERT INTO payment_tokens (userId, gatewayId, token, tokenType, maskedCardNumber, cardBrand, expiryMonth, expiryYear, cardHolderName, isDefault, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, gatewayId, token, tokenType, maskedCardNumber || null, cardBrand || null, expiryMonth || null, expiryYear || null, cardHolderName || null, isDefault || false, metadata ? JSON.stringify(metadata) : null]
    );
    
    const [newItem] = await pool.execute('SELECT * FROM payment_tokens WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    if (item.metadata && typeof item.metadata === 'string') {
      try {
        item.metadata = JSON.parse(item.metadata);
      } catch (e) {}
    }
    item.isDefault = Boolean(item.isDefault);
    item.isActive = Boolean(item.isActive);
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating payment token:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete payment token
api.delete('/payment-tokens/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM payment_tokens WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Payment token not found' });
    }
    res.json({ message: 'Payment token deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment token:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== PAYMENTS ====================

// Get all payments
api.get('/payments', async (req, res) => {
  try {
    const { userId, orderId, paymentStatus, gatewayId, startDate, endDate } = req.query;
    let query = `SELECT p.*, pg.name as gatewayName, pg.displayName as gatewayDisplayName 
                 FROM payments p 
                 LEFT JOIN payment_gateways pg ON p.gatewayId = pg.id 
                 WHERE 1=1`;
    const params = [];
    
    if (userId) {
      query += ' AND p.userId = ?';
      params.push(userId);
    }
    if (orderId) {
      query += ' AND p.orderId = ?';
      params.push(orderId);
    }
    if (paymentStatus) {
      query += ' AND p.paymentStatus = ?';
      params.push(paymentStatus);
    }
    if (gatewayId) {
      query += ' AND p.gatewayId = ?';
      params.push(gatewayId);
    }
    if (startDate) {
      query += ' AND DATE(p.createdAt) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(p.createdAt) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY p.createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.metadata && typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata);
        } catch (e) {}
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    // If table doesn't exist, return empty array instead of error
    if (error.message && error.message.includes("doesn't exist")) {
      res.json([]);
    } else {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Get payment by ID
api.get('/payments/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.*, pg.name as gatewayName, pg.displayName as gatewayDisplayName 
       FROM payments p 
       LEFT JOIN payment_gateways pg ON p.gatewayId = pg.id 
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    
    const item = rows[0];
    if (item.metadata && typeof item.metadata === 'string') {
      try {
        item.metadata = JSON.parse(item.metadata);
      } catch (e) {}
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create payment (initiate payment)
api.post('/payments', async (req, res) => {
  try {
    const { userId, orderId, outstandingId, gatewayId, tokenId, amount, currency, paymentMethod, metadata, ipAddress, userAgent } = req.body;
    
    const paymentNumber = generatePaymentNumber();
    
    const [result] = await pool.execute(
      `INSERT INTO payments (paymentNumber, userId, orderId, outstandingId, gatewayId, tokenId, amount, currency, paymentMethod, metadata, ipAddress, userAgent, paymentStatus) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [paymentNumber, userId, orderId || null, outstandingId || null, gatewayId || null, tokenId || null, amount, currency || 'INR', paymentMethod, metadata ? JSON.stringify(metadata) : null, ipAddress || null, userAgent || null]
    );
    
    const [newItem] = await pool.execute('SELECT * FROM payments WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    if (item.metadata && typeof item.metadata === 'string') {
      try {
        item.metadata = JSON.parse(item.metadata);
      } catch (e) {}
    }
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update payment status (for gateway callbacks)
api.put('/payments/:id/status', async (req, res) => {
  try {
    const { paymentStatus, gatewayTransactionId, gatewayOrderId, gatewayPaymentId, failureReason, failureCode, metadata } = req.body;
    
    const updates = [];
    const values = [];
    
    if (paymentStatus) { updates.push('paymentStatus = ?'); values.push(paymentStatus); }
    if (gatewayTransactionId) { updates.push('gatewayTransactionId = ?'); values.push(gatewayTransactionId); }
    if (gatewayOrderId) { updates.push('gatewayOrderId = ?'); values.push(gatewayOrderId); }
    if (gatewayPaymentId) { updates.push('gatewayPaymentId = ?'); values.push(gatewayPaymentId); }
    if (failureReason !== undefined) { updates.push('failureReason = ?'); values.push(failureReason); }
    if (failureCode !== undefined) { updates.push('failureCode = ?'); values.push(failureCode); }
    if (metadata !== undefined) { updates.push('metadata = ?'); values.push(JSON.stringify(metadata)); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    await pool.execute(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.execute('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    
    const item = rows[0];
    if (item.metadata && typeof item.metadata === 'string') {
      try {
        item.metadata = JSON.parse(item.metadata);
      } catch (e) {}
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== PAYMENT TRANSACTIONS ====================

// Get payment transactions
api.get('/payment-transactions', async (req, res) => {
  try {
    const { paymentId, transactionType, status } = req.query;
    let query = 'SELECT * FROM payment_transactions WHERE 1=1';
    const params = [];
    
    if (paymentId) {
      query += ' AND paymentId = ?';
      params.push(paymentId);
    }
    if (transactionType) {
      query += ' AND transactionType = ?';
      params.push(transactionType);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.gatewayResponse && typeof item.gatewayResponse === 'string') {
        try {
          item.gatewayResponse = JSON.parse(item.gatewayResponse);
        } catch (e) {}
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching payment transactions:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create payment transaction
api.post('/payment-transactions', async (req, res) => {
  try {
    const { paymentId, transactionType, amount, currency, gatewayTransactionId, gatewayResponse, status, failureReason, failureCode } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO payment_transactions (paymentId, transactionType, amount, currency, gatewayTransactionId, gatewayResponse, status, failureReason, failureCode, processedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, transactionType, amount, currency || 'INR', gatewayTransactionId || null, gatewayResponse ? JSON.stringify(gatewayResponse) : null, status || 'pending', failureReason || null, failureCode || null, status === 'success' ? new Date() : null]
    );
    
    const [newItem] = await pool.execute('SELECT * FROM payment_transactions WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    if (item.gatewayResponse && typeof item.gatewayResponse === 'string') {
      try {
        item.gatewayResponse = JSON.parse(item.gatewayResponse);
      } catch (e) {}
    }
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating payment transaction:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== REFUNDS ====================

// Get all refunds
api.get('/refunds', async (req, res) => {
  try {
    const { paymentId, orderId, userId, refundStatus, startDate, endDate } = req.query;
    let query = 'SELECT * FROM refunds WHERE 1=1';
    const params = [];
    
    if (paymentId) {
      query += ' AND paymentId = ?';
      params.push(paymentId);
    }
    if (orderId) {
      query += ' AND orderId = ?';
      params.push(orderId);
    }
    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }
    if (refundStatus) {
      query += ' AND refundStatus = ?';
      params.push(refundStatus);
    }
    if (startDate) {
      query += ' AND DATE(createdAt) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(createdAt) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.gatewayResponse && typeof item.gatewayResponse === 'string') {
        try {
          item.gatewayResponse = JSON.parse(item.gatewayResponse);
        } catch (e) {}
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create refund
api.post('/refunds', async (req, res) => {
  try {
    const { paymentId, orderId, userId, amount, currency, refundType, refundReason, processedBy } = req.body;
    
    // Verify payment exists and get amount
    const [paymentRows] = await pool.execute('SELECT * FROM payments WHERE id = ?', [paymentId]);
    if (paymentRows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const payment = paymentRows[0];
    const refundAmount = parseFloat(amount);
    const paymentAmount = parseFloat(payment.amount);
    
    if (refundAmount > paymentAmount) {
      return res.status(400).json({ error: 'Refund amount cannot exceed payment amount' });
    }
    
    const refundNumber = generateRefundNumber();
    
    const [result] = await pool.execute(
      `INSERT INTO refunds (refundNumber, paymentId, orderId, userId, amount, currency, refundType, refundReason, processedBy, refundStatus) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [refundNumber, paymentId, orderId || null, userId, refundAmount, currency || 'INR', refundType, refundReason || null, processedBy || null]
    );
    
    // Update payment status if full refund
    if (refundType === 'full' && refundAmount === paymentAmount) {
      await pool.execute('UPDATE payments SET paymentStatus = ? WHERE id = ?', ['refunded', paymentId]);
    }
    
    const [newItem] = await pool.execute('SELECT * FROM refunds WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    if (item.gatewayResponse && typeof item.gatewayResponse === 'string') {
      try {
        item.gatewayResponse = JSON.parse(item.gatewayResponse);
      } catch (e) {}
    }
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating refund:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update refund status
api.put('/refunds/:id/status', async (req, res) => {
  try {
    const { refundStatus, gatewayRefundId, gatewayResponse, failureReason, processedBy } = req.body;
    
    const updates = [];
    const values = [];
    
    if (refundStatus) { updates.push('refundStatus = ?'); values.push(refundStatus); }
    if (gatewayRefundId) { updates.push('gatewayRefundId = ?'); values.push(gatewayRefundId); }
    if (gatewayResponse !== undefined) { updates.push('gatewayResponse = ?'); values.push(JSON.stringify(gatewayResponse)); }
    if (failureReason !== undefined) { updates.push('failureReason = ?'); values.push(failureReason); }
    if (processedBy) { updates.push('processedBy = ?'); values.push(processedBy); }
    if (refundStatus === 'success') { updates.push('processedAt = NOW()'); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    await pool.execute(`UPDATE refunds SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.execute('SELECT * FROM refunds WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Refund not found' });
    
    const item = rows[0];
    if (item.gatewayResponse && typeof item.gatewayResponse === 'string') {
      try {
        item.gatewayResponse = JSON.parse(item.gatewayResponse);
      } catch (e) {}
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error updating refund status:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== INVOICES ====================

// Get all invoices
api.get('/invoices', async (req, res) => {
  try {
    const { orderId, userId, invoiceStatus, invoiceType, startDate, endDate } = req.query;
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];
    
    if (orderId) {
      query += ' AND orderId = ?';
      params.push(orderId);
    }
    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }
    if (invoiceStatus) {
      query += ' AND invoiceStatus = ?';
      params.push(invoiceStatus);
    }
    if (invoiceType) {
      query += ' AND invoiceType = ?';
      params.push(invoiceType);
    }
    if (startDate) {
      query += ' AND DATE(invoiceDate) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(invoiceDate) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY invoiceDate DESC, createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      ['items', 'taxDetails'].forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {}
        }
      });
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get invoice by ID
api.get('/invoices/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    
    const item = rows[0];
    ['items', 'taxDetails'].forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create invoice
api.post('/invoices', async (req, res) => {
  try {
    const { orderId, userId, invoiceType, invoiceDate, dueDate, subtotal, taxAmount, discountAmount, shippingAmount, totalAmount, billingAddress, shippingAddress, items, taxDetails, notes, termsAndConditions } = req.body;
    
    const invoiceNumber = generateInvoiceNumber();
    const balanceAmount = parseFloat(totalAmount) - (parseFloat(req.body.paidAmount) || 0);
    
    const [result] = await pool.execute(
      `INSERT INTO invoices (invoiceNumber, orderId, userId, invoiceType, invoiceDate, dueDate, subtotal, taxAmount, discountAmount, shippingAmount, totalAmount, paidAmount, balanceAmount, billingAddress, shippingAddress, items, taxDetails, notes, termsAndConditions, invoiceStatus) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        invoiceNumber, orderId || null, userId, invoiceType || 'sales', invoiceDate || new Date().toISOString().split('T')[0], 
        dueDate || null, subtotal || 0, taxAmount || 0, discountAmount || 0, shippingAmount || 0, totalAmount, 
        req.body.paidAmount || 0, balanceAmount, billingAddress || null, shippingAddress || null,
        items ? JSON.stringify(items) : null, taxDetails ? JSON.stringify(taxDetails) : null, notes || null, termsAndConditions || null
      ]
    );
    
    const [newItem] = await pool.execute('SELECT * FROM invoices WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    ['items', 'taxDetails'].forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update invoice
api.put('/invoices/:id', async (req, res) => {
  try {
    const { invoiceStatus, paidAmount, notes, pdfPath } = req.body;
    
    const updates = [];
    const values = [];
    
    if (invoiceStatus) { updates.push('invoiceStatus = ?'); values.push(invoiceStatus); }
    if (paidAmount !== undefined) {
      // Get current invoice to calculate balance
      const [current] = await pool.execute('SELECT totalAmount, paidAmount FROM invoices WHERE id = ?', [req.params.id]);
      if (current.length > 0) {
        const newPaidAmount = parseFloat(paidAmount);
        const totalAmount = parseFloat(current[0].totalAmount);
        const balanceAmount = totalAmount - newPaidAmount;
        updates.push('paidAmount = ?'); values.push(newPaidAmount);
        updates.push('balanceAmount = ?'); values.push(balanceAmount);
      }
    }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (pdfPath !== undefined) { updates.push('pdfPath = ?'); values.push(pdfPath); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    await pool.execute(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.execute('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    
    const item = rows[0];
    ['items', 'taxDetails'].forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    
    res.json(item);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== RECONCILIATIONS ====================

// Get all reconciliations
api.get('/reconciliations', async (req, res) => {
  try {
    const { gatewayId, reconciliationStatus, startDate, endDate } = req.query;
    let query = 'SELECT * FROM payment_reconciliations WHERE 1=1';
    const params = [];
    
    if (gatewayId) {
      query += ' AND gatewayId = ?';
      params.push(gatewayId);
    }
    if (reconciliationStatus) {
      query += ' AND reconciliationStatus = ?';
      params.push(reconciliationStatus);
    }
    if (startDate) {
      query += ' AND DATE(reconciliationDate) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(reconciliationDate) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY reconciliationDate DESC, createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      ['gatewayStatement', 'discrepancies'].forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try {
            item[field] = JSON.parse(item[field]);
          } catch (e) {}
        }
      });
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching reconciliations:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create reconciliation
api.post('/reconciliations', async (req, res) => {
  try {
    const { gatewayId, reconciliationDate, startDate, endDate, gatewayStatement, reconciledBy } = req.body;
    
    const reconciliationNumber = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Process gateway statement and match with payments
    const statement = gatewayStatement || [];
    let totalTransactions = statement.length;
    let totalAmount = 0;
    let matchedTransactions = 0;
    let matchedAmount = 0;
    let unmatchedTransactions = 0;
    let unmatchedAmount = 0;
    let discrepancyCount = 0;
    const discrepancies = [];
    
    // Get payments in date range
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE gatewayId = ? AND DATE(createdAt) BETWEEN ? AND ?',
      [gatewayId, startDate, endDate]
    );
    
    // Match transactions
    for (const stmtTx of statement) {
      totalAmount += parseFloat(stmtTx.amount || 0);
      const matchedPayment = payments.find(p => 
        p.gatewayTransactionId === stmtTx.transactionId || 
        p.gatewayPaymentId === stmtTx.paymentId
      );
      
      if (matchedPayment) {
        matchedTransactions++;
        matchedAmount += parseFloat(stmtTx.amount || 0);
        
        const paymentAmount = parseFloat(matchedPayment.amount);
        const stmtAmount = parseFloat(stmtTx.amount || 0);
        
        if (Math.abs(paymentAmount - stmtAmount) > 0.01) {
          discrepancyCount++;
          discrepancies.push({
            paymentId: matchedPayment.id,
            gatewayTransactionId: stmtTx.transactionId,
            paymentAmount,
            gatewayAmount: stmtAmount,
            discrepancyAmount: paymentAmount - stmtAmount
          });
        }
      } else {
        unmatchedTransactions++;
        unmatchedAmount += parseFloat(stmtTx.amount || 0);
      }
    }
    
    const [result] = await pool.execute(
      `INSERT INTO payment_reconciliations (reconciliationNumber, gatewayId, reconciliationDate, startDate, endDate, totalTransactions, totalAmount, matchedTransactions, matchedAmount, unmatchedTransactions, unmatchedAmount, discrepancyCount, gatewayStatement, discrepancies, reconciliationStatus, reconciledBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        reconciliationNumber, gatewayId, reconciliationDate || new Date().toISOString().split('T')[0], 
        startDate, endDate, totalTransactions, totalAmount, matchedTransactions, matchedAmount,
        unmatchedTransactions, unmatchedAmount, discrepancyCount,
        JSON.stringify(gatewayStatement), JSON.stringify(discrepancies), reconciledBy || null
      ]
    );
    
    const [newItem] = await pool.execute('SELECT * FROM payment_reconciliations WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    ['gatewayStatement', 'discrepancies'].forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating reconciliation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update reconciliation status
api.put('/reconciliations/:id/status', async (req, res) => {
  try {
    const { reconciliationStatus, notes, reconciledBy } = req.body;
    
    const updates = [];
    const values = [];
    
    if (reconciliationStatus) { updates.push('reconciliationStatus = ?'); values.push(reconciliationStatus); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (reconciledBy) { updates.push('reconciledBy = ?'); values.push(reconciledBy); }
    if (reconciliationStatus === 'completed') { updates.push('reconciledAt = NOW()'); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    await pool.execute(`UPDATE payment_reconciliations SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.execute('SELECT * FROM payment_reconciliations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Reconciliation not found' });
    
    const item = rows[0];
    ['gatewayStatement', 'discrepancies'].forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        try {
          item[field] = JSON.parse(item[field]);
        } catch (e) {}
      }
    });
    
    res.json(item);
  } catch (error) {
    console.error('Error updating reconciliation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== ACCOUNTING EXPORTS ====================

// Get all accounting exports
api.get('/accounting-exports', async (req, res) => {
  try {
    const { exportType, exportStatus, startDate, endDate } = req.query;
    let query = 'SELECT * FROM accounting_exports WHERE 1=1';
    const params = [];
    
    if (exportType) {
      query += ' AND exportType = ?';
      params.push(exportType);
    }
    if (exportStatus) {
      query += ' AND exportStatus = ?';
      params.push(exportStatus);
    }
    if (startDate) {
      query += ' AND DATE(createdAt) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(createdAt) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.filters && typeof item.filters === 'string') {
        try {
          item.filters = JSON.parse(item.filters);
        } catch (e) {}
      }
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching accounting exports:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create accounting export
api.post('/accounting-exports', async (req, res) => {
  try {
    const { exportType, format, startDate, endDate, filters, exportedBy } = req.body;
    
    const exportNumber = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const [result] = await pool.execute(
      `INSERT INTO accounting_exports (exportNumber, exportType, format, startDate, endDate, filters, exportStatus, exportedBy) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [exportNumber, exportType, format || 'csv', startDate || null, endDate || null, filters ? JSON.stringify(filters) : null, exportedBy || null]
    );
    
    // In a real implementation, this would trigger an async job to generate the export file
    // For now, we'll just return the created record
    
    const [newItem] = await pool.execute('SELECT * FROM accounting_exports WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    if (item.filters && typeof item.filters === 'string') {
      try {
        item.filters = JSON.parse(item.filters);
      } catch (e) {}
    }
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating accounting export:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update accounting export status
api.put('/accounting-exports/:id/status', async (req, res) => {
  try {
    const { exportStatus, filePath, fileSize, recordCount, errorMessage } = req.body;
    
    const updates = [];
    const values = [];
    
    if (exportStatus) { updates.push('exportStatus = ?'); values.push(exportStatus); }
    if (filePath) { updates.push('filePath = ?'); values.push(filePath); }
    if (fileSize !== undefined) { updates.push('fileSize = ?'); values.push(fileSize); }
    if (recordCount !== undefined) { updates.push('recordCount = ?'); values.push(recordCount); }
    if (errorMessage !== undefined) { updates.push('errorMessage = ?'); values.push(errorMessage); }
    if (exportStatus === 'completed' || exportStatus === 'failed') { updates.push('completedAt = NOW()'); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    await pool.execute(`UPDATE accounting_exports SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.execute('SELECT * FROM accounting_exports WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Accounting export not found' });
    
    const item = rows[0];
    if (item.filters && typeof item.filters === 'string') {
      try {
        item.filters = JSON.parse(item.filters);
      } catch (e) {}
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error updating accounting export:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== PAYMENT WEBHOOKS ====================

// Get payment webhooks
api.get('/payment-webhooks', async (req, res) => {
  try {
    const { gatewayId, eventType, isProcessed } = req.query;
    let query = 'SELECT * FROM payment_webhooks WHERE 1=1';
    const params = [];
    
    if (gatewayId) {
      query += ' AND gatewayId = ?';
      params.push(gatewayId);
    }
    if (eventType) {
      query += ' AND eventType = ?';
      params.push(eventType);
    }
    if (isProcessed !== undefined) {
      query += ' AND isProcessed = ?';
      params.push(isProcessed === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const [rows] = await pool.execute(query, params);
    
    const parsedRows = rows.map(row => {
      const item = { ...row };
      if (item.payload && typeof item.payload === 'string') {
        try {
          item.payload = JSON.parse(item.payload);
        } catch (e) {}
      }
      item.isVerified = Boolean(item.isVerified);
      item.isProcessed = Boolean(item.isProcessed);
      return item;
    });
    
    res.json(parsedRows);
  } catch (error) {
    console.error('Error fetching payment webhooks:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create payment webhook (for gateway callbacks)
api.post('/payment-webhooks', async (req, res) => {
  try {
    const { gatewayId, eventType, webhookId, payload, signature } = req.body;
    
    // In production, verify webhook signature here
    
    const [result] = await pool.execute(
      `INSERT INTO payment_webhooks (gatewayId, eventType, webhookId, payload, signature, isVerified) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [gatewayId, eventType, webhookId || null, JSON.stringify(payload), signature || null, true] // Set to true after verification
    );
    
    // Process webhook based on event type
    // This would typically be done asynchronously
    if (eventType === 'payment.success' || eventType === 'payment.failed') {
      // Update payment status
      const paymentId = payload.payment?.id || payload.entity?.id;
      if (paymentId) {
        const paymentStatus = eventType.includes('success') ? 'success' : 'failed';
        await pool.execute(
          'UPDATE payments SET paymentStatus = ?, gatewayTransactionId = ?, gatewayPaymentId = ?, metadata = ? WHERE gatewayPaymentId = ? OR gatewayTransactionId = ?',
          [paymentStatus, payload.entity?.id || null, payload.entity?.id || null, JSON.stringify(payload), paymentId, paymentId]
        );
      }
    }
    
    // Mark as processed
    await pool.execute('UPDATE payment_webhooks SET isProcessed = TRUE, processedAt = NOW() WHERE id = ?', [result.insertId]);
    
    const [newItem] = await pool.execute('SELECT * FROM payment_webhooks WHERE id = ?', [result.insertId]);
    const item = newItem[0];
    if (item.payload && typeof item.payload === 'string') {
      try {
        item.payload = JSON.parse(item.payload);
      } catch (e) {}
    }
    item.isVerified = Boolean(item.isVerified);
    item.isProcessed = Boolean(item.isProcessed);
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating payment webhook:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== PAYMENT STATISTICS ====================

// Get payment statistics
api.get('/payments/statistics', async (req, res) => {
  try {
    const { startDate, endDate, gatewayId } = req.query;
    let query = `SELECT 
      COUNT(*) as totalPayments,
      SUM(CASE WHEN paymentStatus = 'success' THEN 1 ELSE 0 END) as successfulPayments,
      SUM(CASE WHEN paymentStatus = 'failed' THEN 1 ELSE 0 END) as failedPayments,
      SUM(CASE WHEN paymentStatus = 'pending' THEN 1 ELSE 0 END) as pendingPayments,
      SUM(CASE WHEN paymentStatus = 'success' THEN amount ELSE 0 END) as totalAmount,
      SUM(CASE WHEN paymentStatus = 'success' THEN amount ELSE 0 END) / NULLIF(COUNT(CASE WHEN paymentStatus = 'success' THEN 1 END), 0) as averageAmount,
      SUM(CASE WHEN paymentMethod = 'card' THEN 1 ELSE 0 END) as cardPayments,
      SUM(CASE WHEN paymentMethod = 'upi' THEN 1 ELSE 0 END) as upiPayments,
      SUM(CASE WHEN paymentMethod = 'netbanking' THEN 1 ELSE 0 END) as netbankingPayments
    FROM payments WHERE 1=1`;
    const params = [];
    
    if (startDate) {
      query += ' AND DATE(createdAt) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(createdAt) <= ?';
      params.push(endDate);
    }
    if (gatewayId) {
      query += ' AND gatewayId = ?';
      params.push(gatewayId);
    }
    
    const [rows] = await pool.execute(query, params);
    res.json(rows[0] || {});
  } catch (error) {
    // If table doesn't exist, return empty statistics instead of error
    if (error.message && error.message.includes("doesn't exist")) {
      res.json({});
    } else {
      console.error('Error fetching payment statistics:', error);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Auto-create shipment tables if they don't exist
async function createShipmentTables() {
  try {
    // Create shipments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shipments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT NOT NULL,
        shipmentNumber VARCHAR(100) UNIQUE NOT NULL,
        logisticsPartner VARCHAR(50) NOT NULL,
        trackingNumber VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        labelUrl TEXT,
        labelData JSON,
        originAddress JSON NOT NULL,
        destinationAddress JSON NOT NULL,
        weight DECIMAL(10, 2),
        dimensions JSON,
        shippingCost DECIMAL(10, 2),
        estimatedDeliveryDate DATE,
        actualDeliveryDate DATE,
        notes TEXT,
        partnerApiResponse JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orderId (orderId),
        INDEX idx_shipmentNumber (shipmentNumber),
        INDEX idx_trackingNumber (trackingNumber),
        INDEX idx_status (status),
        INDEX idx_logisticsPartner (logisticsPartner),
        INDEX idx_createdAt (createdAt)
      )
    `);

    // Create shipment_tracking table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shipment_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipmentId INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        location VARCHAR(255),
        description TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source VARCHAR(50) DEFAULT 'system',
        metadata JSON,
        INDEX idx_shipmentId (shipmentId),
        INDEX idx_timestamp (timestamp),
        INDEX idx_status (status)
      )
    `);

    // Create logistics_partners table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS logistics_partners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        displayName VARCHAR(255) NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        apiEndpoint VARCHAR(500),
        apiKey VARCHAR(255),
        apiSecret VARCHAR(255),
        config JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_isActive (isActive)
      )
    `);

    // Insert default logistics partners if they don't exist
    await pool.execute(`
      INSERT IGNORE INTO logistics_partners (name, displayName, isActive, config) VALUES
      ('shadow', 'Shadow Logistics', TRUE, '{"baseUrl": "https://api.shadowlogistics.com", "webhookUrl": "", "autoTracking": true}'),
      ('dhl', 'DHL Express', FALSE, '{"baseUrl": "https://api.dhl.com", "webhookUrl": "", "autoTracking": true}'),
      ('delhivery', 'Delhivery', FALSE, '{"baseUrl": "https://api.delhivery.com", "webhookUrl": "", "autoTracking": true}')
    `);

    console.log('Shipment tables created/verified successfully');
  } catch (error) {
    console.error('Error creating shipment tables:', error);
  }
}

// Auto-create analytics tables if they don't exist
async function createAnalyticsTables() {
  try {
    // Create analytics_events table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventType VARCHAR(100) NOT NULL,
        entityType VARCHAR(50),
        entityId INT,
        userId VARCHAR(100),
        properties JSON,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_eventType (eventType),
        INDEX idx_entityType (entityType),
        INDEX idx_entityId (entityId),
        INDEX idx_userId (userId),
        INDEX idx_timestamp (timestamp)
      )
    `);

    // Create analytics_metrics table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS analytics_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        metricType VARCHAR(100) NOT NULL,
        metricKey VARCHAR(255) NOT NULL,
        metricValue DECIMAL(15, 2),
        metricData JSON,
        periodStart DATE,
        periodEnd DATE,
        computedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_metric (metricType, metricKey),
        INDEX idx_metricType (metricType),
        INDEX idx_periodStart (periodStart),
        INDEX idx_periodEnd (periodEnd),
        INDEX idx_computedAt (computedAt)
      )
    `);

    // Create analytics_dashboards table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS analytics_dashboards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSON NOT NULL,
        isDefault BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_isDefault (isDefault)
      )
    `);

    // Insert default dashboards if they don't exist
    await pool.execute(`
      INSERT IGNORE INTO analytics_dashboards (name, description, config, isDefault) VALUES
      ('Sales Dashboard', 'Overview of sales performance', '{"widgets": ["sales_overview", "sales_trend", "top_products", "sales_by_category"]}', TRUE),
      ('Inventory Dashboard', 'Inventory turnover and stock levels', '{"widgets": ["inventory_turnover", "stock_levels", "low_stock_alerts", "inventory_value"]}', FALSE),
      ('Orders Dashboard', 'Pending and completed orders analysis', '{"widgets": ["pending_orders", "order_status", "order_trend", "average_order_value"]}', FALSE),
      ('Receivables Dashboard', 'Aging receivables and payment tracking', '{"widgets": ["aging_receivables", "payment_status", "collection_trend", "outstanding_summary"]}', FALSE)
    `);

    console.log('Analytics tables created/verified successfully');
  } catch (error) {
    console.error('Error creating analytics tables:', error);
  }
}

// Initialize all tables on server start
async function initializeTables() {
  await createCatalogTables();
  await createInventoryTables();
  await createOrderTables();
  await createPricingTables();
  await createPaymentTables();
  await createShipmentTables();
  await createAnalyticsTables();
}

// Initialize tables
initializeTables().catch(console.error);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scanxo API running on http://localhost:${PORT}`);
});
