// Shared API service for admin panel
// Uses MySQL database through Express API (server/index.js)
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// Axios instance with error handling
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

// Products API - MySQL only
export const productsAPI = {
  getAll: async () => {
    const response = await api.get('/products');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  create: async (product) => {
    const response = await api.post('/products', product);
    return response.data;
  },
  update: async (id, product) => {
    const response = await api.put(`/products/${id}`, product);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

// Categories API - MySQL only
export const categoriesAPI = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  create: async (category) => {
    const response = await api.post('/categories', category);
    return response.data;
  },
  update: async (id, category) => {
    const response = await api.put(`/categories/${id}`, category);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

// Banners API - MySQL only
export const bannersAPI = {
  getAll: async () => {
    const response = await api.get('/banners');
    return response.data;
  },
  create: async (banner) => {
    const response = await api.post('/banners', banner);
    return response.data;
  },
  update: async (id, banner) => {
    const response = await api.put(`/banners/${id}`, banner);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/banners/${id}`);
    return response.data;
  },
};

// Orders API - MySQL only
export const ordersAPI = {
  getAll: async () => {
    const response = await api.get('/orders');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  create: async (order) => {
    const response = await api.post('/orders', order);
    return response.data;
  },
  update: async (id, order) => {
    const response = await api.put(`/orders/${id}`, order);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/orders/${id}`, { status });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },
};

// Distributors API - MySQL only
export const distributorsAPI = {
  getAll: async () => {
    const response = await api.get('/distributors');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/distributors/${id}`);
    return response.data;
  },
  create: async (distributor) => {
    const response = await api.post('/distributors', distributor);
    return response.data;
  },
  update: async (id, distributor) => {
    const response = await api.put(`/distributors/${id}`, distributor);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/distributors/${id}`);
    return response.data;
  },
};

// Retailers API - MySQL only
export const retailersAPI = {
  getAll: async () => {
    const response = await api.get('/retailers');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/retailers/${id}`);
    return response.data;
  },
  create: async (retailer) => {
    const response = await api.post('/retailers', retailer);
    return response.data;
  },
  update: async (id, retailer) => {
    const response = await api.put(`/retailers/${id}`, retailer);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/retailers/${id}`);
    return response.data;
  },
};

// Company Offers API
export const companyOffersAPI = {
  getAll: async () => {
    const response = await api.get('/company-offers/all');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/company-offers/${id}`);
    return response.data;
  },
  create: async (offer) => {
    const response = await api.post('/company-offers', offer);
    return response.data;
  },
  update: async (id, offer) => {
    const response = await api.put(`/company-offers/${id}`, offer);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/company-offers/${id}`);
    return response.data;
  },
};

// Statistics API
export const statsAPI = {
  getDashboardStats: async () => {
    const [products, orders, retailers] = await Promise.all([
      productsAPI.getAll(),
      ordersAPI.getAll(),
      retailersAPI.getAll(),
    ]);
    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRetailers: retailers.length,
      pendingOrders: orders.filter(o => o.status === 'pending' || o.status === 'processing').length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      recentOrders: orders.slice(-5).reverse(),
    };
  },
};

// KYC API - MySQL only
export const kycAPI = {
  // Profiles
  getAllProfiles: async () => {
    const response = await api.get('/kyc/profiles');
    return response.data;
  },
  getProfile: async (id) => {
    const response = await api.get(`/kyc/profiles/${id}`);
    return response.data;
  },
  getProfileByUserId: async (userId) => {
    const response = await api.get(`/kyc/profiles/user/${userId}`);
    return response.data;
  },
  updateProfile: async (id, profile) => {
    const response = await api.put(`/kyc/profiles/${id}`, profile);
    return response.data;
  },
  deleteProfile: async (id) => {
    const response = await api.delete(`/kyc/profiles/${id}`);
    return response.data;
  },

  // Documents
  getAllDocuments: async (userId) => {
    const url = userId ? `/kyc/documents?userId=${userId}` : '/kyc/documents';
    const response = await api.get(url);
    return response.data;
  },
  getDocument: async (id) => {
    const response = await api.get(`/kyc/documents/${id}`);
    return response.data;
  },
  updateDocument: async (id, document) => {
    const response = await api.put(`/kyc/documents/${id}`, document);
    return response.data;
  },
  deleteDocument: async (id) => {
    const response = await api.delete(`/kyc/documents/${id}`);
    return response.data;
  },

  // Verifications
  getAllVerifications: async (userId) => {
    const url = userId ? `/kyc/verifications?userId=${userId}` : '/kyc/verifications';
    const response = await api.get(url);
    return response.data;
  },
  getVerification: async (id) => {
    const response = await api.get(`/kyc/verifications/${id}`);
    return response.data;
  },
  updateVerification: async (id, verification) => {
    const response = await api.put(`/kyc/verifications/${id}`, verification);
    return response.data;
  },

  // Business License
  getBusinessLicense: async (userId) => {
    const response = await api.get(`/kyc/business-license/${userId}`);
    return response.data;
  },
  updateBusinessLicense: async (userId, licenseData) => {
    const response = await api.put(`/kyc/business-license/${userId}`, licenseData);
    return response.data;
  },

  // GST Info
  getGSTInfo: async (userId) => {
    const response = await api.get(`/kyc/gst/${userId}`);
    return response.data;
  },
  updateGSTInfo: async (userId, gstData) => {
    const response = await api.put(`/kyc/gst/${userId}`, gstData);
    return response.data;
  },

  // Credit Limit
  getCreditLimit: async (userId) => {
    const response = await api.get(`/kyc/credit-limit/${userId}`);
    return response.data;
  },
  updateCreditLimit: async (userId, creditData) => {
    const response = await api.put(`/kyc/credit-limit/${userId}`, creditData);
    return response.data;
  },

  // eKYC
  verifyWithEKYC: async (userId, provider, documentType, documentData) => {
    const response = await api.post('/kyc/ekyc/verify', { userId, provider, documentType, documentData });
    return response.data;
  },
};

// Rewards API
export const rewardsAPI = {
  getAll: async () => {
    const response = await api.get('/rewards');
    return response.data;
  },
  getByUserId: async (userId) => {
    const response = await api.get(`/rewards/${userId}`);
    return response.data;
  },
  getHistory: async (userId, type = null) => {
    const url = type ? `/rewards/${userId}/history?type=${type}` : `/rewards/${userId}/history`;
    const response = await api.get(url);
    return response.data;
  },
  getAllHistory: async (type = null) => {
    const url = type ? `/rewards/history/all?type=${type}` : '/rewards/history/all';
    const response = await api.get(url);
    return response.data;
  },
  update: async (userId, rewards) => {
    const response = await api.put(`/rewards/${userId}`, rewards);
    return response.data;
  },
  earnPoints: async (userId, points, description, orderId = null, transactionId = null) => {
    const response = await api.post(`/rewards/${userId}/earn`, { points, description, orderId, transactionId });
    return response.data;
  },
  redeemPoints: async (userId, points, description, transactionId = null) => {
    const response = await api.post(`/rewards/${userId}/redeem`, { points, description, transactionId });
    return response.data;
  },
  deleteHistory: async (id) => {
    const response = await api.delete(`/rewards/history/${id}`);
    return response.data;
  },
};

// Outstanding API
export const outstandingAPI = {
  getAll: async (status = null, userId = null) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (userId) params.append('userId', userId);
    const url = `/outstanding${params.toString() ? '?' + params.toString() : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  getByUserId: async (userId, status = null) => {
    const url = status ? `/outstanding/${userId}?status=${status}` : `/outstanding/${userId}`;
    const response = await api.get(url);
    return response.data;
  },
  getSummary: async (userId) => {
    const response = await api.get(`/outstanding/${userId}/summary`);
    return response.data;
  },
  getAllSummary: async () => {
    const response = await api.get('/outstanding/summary/all');
    return response.data;
  },
  getHistory: async (outstandingId) => {
    const response = await api.get(`/outstanding/${outstandingId}/history`);
    return response.data;
  },
  getAllHistory: async (outstandingId = null, userId = null) => {
    const params = new URLSearchParams();
    if (outstandingId) params.append('outstandingId', outstandingId);
    if (userId) params.append('userId', userId);
    const url = `/outstanding/history/all${params.toString() ? '?' + params.toString() : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  create: async (outstanding) => {
    const response = await api.post('/outstanding', outstanding);
    return response.data;
  },
  update: async (id, outstanding) => {
    const response = await api.put(`/outstanding/${id}`, outstanding);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/outstanding/${id}`);
    return response.data;
  },
  makePayment: async (userId, outstandingId, amount, paymentMethod, transactionId, description, paymentDate) => {
    const response = await api.post(`/outstanding/${userId}/pay`, {
      outstandingId,
      amount,
      paymentMethod,
      transactionId,
      description,
      paymentDate,
    });
    return response.data;
  },
};
