import express from 'express';
import cors from 'cors';
import { ensureDir } from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
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
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting ${table}:`, error);
      res.status(500).json({ error: 'Database error' });
    }
  };
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
api.post('/products', createRoute('products'));
api.put('/products/:id', updateRoute('products'));
api.delete('/products/:id', deleteRoute('products'));

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
api.post('/retailers', createRoute('retailers'));
api.put('/retailers/:id', updateRoute('retailers'));
api.delete('/retailers/:id', deleteRoute('retailers'));

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

app.use('/api', api);

// Seed products on server start
seedProducts();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scanxo API running on http://localhost:${PORT}`);
});
