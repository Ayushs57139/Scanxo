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
  search: async (query) => {
    const response = await api.get(`/products/search/${encodeURIComponent(query)}`);
    return response.data;
  },
  // SKUs
  getSKUs: async (productId) => {
    const response = await api.get(`/products/${productId}/skus`);
    return response.data;
  },
  createSKU: async (productId, sku) => {
    const response = await api.post(`/products/${productId}/skus`, sku);
    return response.data;
  },
  updateSKU: async (skuId, sku) => {
    const response = await api.put(`/products/skus/${skuId}`, sku);
    return response.data;
  },
  deleteSKU: async (skuId) => {
    const response = await api.delete(`/products/skus/${skuId}`);
    return response.data;
  },
  // Price Tiers
  getPriceTiers: async (productId) => {
    const response = await api.get(`/products/${productId}/price-tiers`);
    return response.data;
  },
  createPriceTier: async (productId, tier) => {
    const response = await api.post(`/products/${productId}/price-tiers`, tier);
    return response.data;
  },
  updatePriceTier: async (tierId, tier) => {
    const response = await api.put(`/products/price-tiers/${tierId}`, tier);
    return response.data;
  },
  deletePriceTier: async (tierId) => {
    const response = await api.delete(`/products/price-tiers/${tierId}`);
    return response.data;
  },
  // Unit Conversions
  getUnitConversions: async (productId) => {
    const response = await api.get(`/products/${productId}/unit-conversions`);
    return response.data;
  },
  createUnitConversion: async (productId, conversion) => {
    const response = await api.post(`/products/${productId}/unit-conversions`, conversion);
    return response.data;
  },
  updateUnitConversion: async (conversionId, conversion) => {
    const response = await api.put(`/products/unit-conversions/${conversionId}`, conversion);
    return response.data;
  },
  deleteUnitConversion: async (conversionId) => {
    const response = await api.delete(`/products/unit-conversions/${conversionId}`);
    return response.data;
  },
  // Substitute Products
  getSubstitutes: async (productId) => {
    const response = await api.get(`/products/${productId}/substitutes`);
    return response.data;
  },
  createSubstitute: async (productId, substitute) => {
    const response = await api.post(`/products/${productId}/substitutes`, substitute);
    return response.data;
  },
  updateSubstitute: async (substituteId, substitute) => {
    const response = await api.put(`/products/substitutes/${substituteId}`, substitute);
    return response.data;
  },
  deleteSubstitute: async (substituteId) => {
    const response = await api.delete(`/products/substitutes/${substituteId}`);
    return response.data;
  },
};

// Inventory API
export const inventoryAPI = {
  // Warehouses
  getWarehouses: async () => {
    const response = await api.get('/warehouses');
    return response.data;
  },
  getWarehouse: async (id) => {
    const response = await api.get(`/warehouses/${id}`);
    return response.data;
  },
  createWarehouse: async (warehouse) => {
    const response = await api.post('/warehouses', warehouse);
    return response.data;
  },
  updateWarehouse: async (id, warehouse) => {
    const response = await api.put(`/warehouses/${id}`, warehouse);
    return response.data;
  },
  deleteWarehouse: async (id) => {
    const response = await api.delete(`/warehouses/${id}`);
    return response.data;
  },
  
  // Stock Inventory
  getStockInventory: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.productId) queryParams.append('productId', params.productId);
    if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
    const response = await api.get(`/stock-inventory?${queryParams.toString()}`);
    return response.data;
  },
  getStockItem: async (id) => {
    const response = await api.get(`/stock-inventory/${id}`);
    return response.data;
  },
  createStockItem: async (stockItem) => {
    const response = await api.post('/stock-inventory', stockItem);
    return response.data;
  },
  updateStockItem: async (id, stockItem) => {
    const response = await api.put(`/stock-inventory/${id}`, stockItem);
    return response.data;
  },
  deleteStockItem: async (id) => {
    const response = await api.delete(`/stock-inventory/${id}`);
    return response.data;
  },
  debitStock: async (debitData) => {
    const response = await api.post('/stock-inventory/debit', debitData);
    return response.data;
  },
  getStockSummary: async (productId, warehouseId = null) => {
    const queryParams = warehouseId ? `?warehouseId=${warehouseId}` : '';
    const response = await api.get(`/stock-inventory/summary/${productId}${queryParams}`);
    return response.data;
  },
  
  // PO Reservations
  getPOReservations: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.poNumber) queryParams.append('poNumber', params.poNumber);
    if (params.productId) queryParams.append('productId', params.productId);
    if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
    if (params.status) queryParams.append('status', params.status);
    const response = await api.get(`/po-reservations?${queryParams.toString()}`);
    return response.data;
  },
  createPOReservation: async (reservation) => {
    const response = await api.post('/po-reservations', reservation);
    return response.data;
  },
  updatePOReservation: async (id, reservation) => {
    const response = await api.put(`/po-reservations/${id}`, reservation);
    return response.data;
  },
  deletePOReservation: async (id) => {
    const response = await api.delete(`/po-reservations/${id}`);
    return response.data;
  },
  
  // Stock Events
  getStockEvents: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.productId) queryParams.append('productId', params.productId);
    if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
    if (params.eventType) queryParams.append('eventType', params.eventType);
    if (params.isPublished !== undefined) queryParams.append('isPublished', params.isPublished);
    const response = await api.get(`/stock-events?${queryParams.toString()}`);
    return response.data;
  },
  publishStockEvent: async (id) => {
    const response = await api.post(`/stock-events/${id}/publish`);
    return response.data;
  },
};

// Order / PO API
export const ordersAPI = {
  // Purchase Orders
  getPurchaseOrders: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
    const response = await api.get(`/purchase-orders?${queryParams.toString()}`);
    return response.data;
  },
  getPurchaseOrder: async (id) => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },
  createPurchaseOrder: async (poData) => {
    const response = await api.post('/purchase-orders', poData);
    return response.data;
  },
  updatePOStatus: async (id, statusData) => {
    const response = await api.put(`/purchase-orders/${id}/status`, statusData);
    return response.data;
  },
  
  // Customer Orders
  getCustomerOrders: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
    if (params.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
    const response = await api.get(`/customer-orders?${queryParams.toString()}`);
    return response.data;
  },
  getCustomerOrder: async (id) => {
    const response = await api.get(`/customer-orders/${id}`);
    return response.data;
  },
  createCustomerOrder: async (orderData) => {
    const response = await api.post('/customer-orders', orderData);
    return response.data;
  },
  updateOrderStatus: async (id, statusData) => {
    const response = await api.put(`/customer-orders/${id}/status`, statusData);
    return response.data;
  },
  
  // Order Returns
  getOrderReturns: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.orderId) queryParams.append('orderId', params.orderId);
    if (params.returnStatus) queryParams.append('returnStatus', params.returnStatus);
    const response = await api.get(`/order-returns?${queryParams.toString()}`);
    return response.data;
  },
  createOrderReturn: async (returnData) => {
    const response = await api.post('/order-returns', returnData);
    return response.data;
  },
  updateReturnStatus: async (id, statusData) => {
    const response = await api.put(`/order-returns/${id}/status`, statusData);
    return response.data;
  },
};

// Pricing / Scheme Engine API
export const pricingAPI = {
  // Discount Rules
  getDiscountRules: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    if (params.ruleType) queryParams.append('ruleType', params.ruleType);
    if (params.applicableTo) queryParams.append('applicableTo', params.applicableTo);
    const response = await api.get(`/discount-rules?${queryParams.toString()}`);
    return response.data;
  },
  getDiscountRule: async (id) => {
    const response = await api.get(`/discount-rules/${id}`);
    return response.data;
  },
  createDiscountRule: async (rule) => {
    const response = await api.post('/discount-rules', rule);
    return response.data;
  },
  updateDiscountRule: async (id, rule) => {
    const response = await api.put(`/discount-rules/${id}`, rule);
    return response.data;
  },
  deleteDiscountRule: async (id) => {
    const response = await api.delete(`/discount-rules/${id}`);
    return response.data;
  },
  
  // Slab Pricing
  getSlabPricing: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.productId) queryParams.append('productId', params.productId);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    const response = await api.get(`/slab-pricing?${queryParams.toString()}`);
    return response.data;
  },
  createSlabPricing: async (slab) => {
    const response = await api.post('/slab-pricing', slab);
    return response.data;
  },
  updateSlabPricing: async (id, slab) => {
    const response = await api.put(`/slab-pricing/${id}`, slab);
    return response.data;
  },
  deleteSlabPricing: async (id) => {
    const response = await api.delete(`/slab-pricing/${id}`);
    return response.data;
  },
  
  // Promo Codes
  getPromoCodes: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    if (params.code) queryParams.append('code', params.code);
    const response = await api.get(`/promo-codes?${queryParams.toString()}`);
    return response.data;
  },
  getPromoCode: async (id) => {
    const response = await api.get(`/promo-codes/${id}`);
    return response.data;
  },
  createPromoCode: async (promoCode) => {
    const response = await api.post('/promo-codes', promoCode);
    return response.data;
  },
  updatePromoCode: async (id, promoCode) => {
    const response = await api.put(`/promo-codes/${id}`, promoCode);
    return response.data;
  },
  deletePromoCode: async (id) => {
    const response = await api.delete(`/promo-codes/${id}`);
    return response.data;
  },
  validatePromoCode: async (code, userId, orderAmount, productIds = [], categoryIds = []) => {
    const response = await api.post('/promo-codes/validate', {
      code,
      userId,
      orderAmount,
      productIds,
      categoryIds
    });
    return response.data;
  },
  
  // Tax Rules
  getTaxRules: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    if (params.taxType) queryParams.append('taxType', params.taxType);
    if (params.applicableTo) queryParams.append('applicableTo', params.applicableTo);
    const response = await api.get(`/tax-rules?${queryParams.toString()}`);
    return response.data;
  },
  createTaxRule: async (taxRule) => {
    const response = await api.post('/tax-rules', taxRule);
    return response.data;
  },
  updateTaxRule: async (id, taxRule) => {
    const response = await api.put(`/tax-rules/${id}`, taxRule);
    return response.data;
  },
  deleteTaxRule: async (id) => {
    const response = await api.delete(`/tax-rules/${id}`);
    return response.data;
  },
  
  // Credit Limits
  getCreditLimits: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.userType) queryParams.append('userType', params.userType);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    const response = await api.get(`/credit-limits?${queryParams.toString()}`);
    return response.data;
  },
  getCreditLimit: async (userId) => {
    const response = await api.get(`/credit-limits/${userId}`);
    return response.data;
  },
  createCreditLimit: async (creditLimit) => {
    const response = await api.post('/credit-limits', creditLimit);
    return response.data;
  },
  updateCreditLimit: async (id, creditLimit) => {
    const response = await api.put(`/credit-limits/${id}`, creditLimit);
    return response.data;
  },
  deleteCreditLimit: async (id) => {
    const response = await api.delete(`/credit-limits/${id}`);
    return response.data;
  },
  
  // Payment Terms
  getPaymentTerms: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    const response = await api.get(`/payment-terms?${queryParams.toString()}`);
    return response.data;
  },
  createPaymentTerm: async (paymentTerm) => {
    const response = await api.post('/payment-terms', paymentTerm);
    return response.data;
  },
  updatePaymentTerm: async (id, paymentTerm) => {
    const response = await api.put(`/payment-terms/${id}`, paymentTerm);
    return response.data;
  },
  deletePaymentTerm: async (id) => {
    const response = await api.delete(`/payment-terms/${id}`);
    return response.data;
  },
  
  // Pricing Calculation
  calculatePricing: async (userId, items, promoCode = null, stateCode = null) => {
    const response = await api.post('/pricing/calculate', {
      userId,
      items,
      promoCode,
      stateCode
    });
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

// Legacy Orders API - MySQL only (for backward compatibility)
// Note: This uses the customer orders endpoint
export const legacyOrdersAPI = {
  getAll: async () => {
    const response = await api.get('/customer-orders');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/customer-orders/${id}`);
    return response.data;
  },
  create: async (order) => {
    const response = await api.post('/customer-orders', order);
    return response.data;
  },
  update: async (id, order) => {
    const response = await api.put(`/customer-orders/${id}`, order);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/customer-orders/${id}/status`, { status });
    return response.data;
  },
  delete: async (id) => {
    // Note: Customer orders may not support direct delete, use cancellation instead
    const response = await api.put(`/customer-orders/${id}/status`, { status: 'cancelled' });
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
  approve: async (id, action, approvedBy, rejectionReason = null) => {
    const response = await api.put(`/retailers/${id}/approve`, {
      action,
      approvedBy,
      rejectionReason,
    });
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
      ordersAPI.getCustomerOrders(), // Use the new ordersAPI
      retailersAPI.getAll(),
    ]);
    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRetailers: retailers.length,
      pendingOrders: orders.filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'created' || o.status === 'confirmed').length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.finalAmount || o.totalAmount || 0), 0),
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

// Payment/Finance Module API
// Shipments & Logistics API
export const shipmentsAPI = {
  // Shipments
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.orderId) queryParams.append('orderId', params.orderId);
    if (params.status) queryParams.append('status', params.status);
    if (params.logisticsPartner) queryParams.append('logisticsPartner', params.logisticsPartner);
    const queryString = queryParams.toString();
    const url = queryString ? `/shipments?${queryString}` : '/shipments';
    const response = await api.get(url);
    return response.data || [];
  },
  getById: async (id) => {
    const response = await api.get(`/shipments/${id}`);
    return response.data;
  },
  create: async (shipmentData) => {
    const response = await api.post('/shipments', shipmentData);
    return response.data;
  },
  update: async (id, shipmentData) => {
    const response = await api.put(`/shipments/${id}`, shipmentData);
    return response.data;
  },
  generateLabel: async (id) => {
    const response = await api.post(`/shipments/${id}/generate-label`);
    return response.data;
  },
  
  // Tracking
  getTracking: async (shipmentId) => {
    const response = await api.get(`/shipments/${shipmentId}/tracking`);
    return response.data;
  },
  updateTracking: async (shipmentId, trackingData) => {
    const response = await api.post(`/shipments/${shipmentId}/tracking`, trackingData);
    return response.data;
  },
  syncTracking: async (shipmentId) => {
    const response = await api.post(`/shipments/${shipmentId}/sync-tracking`);
    return response.data;
  },
  
  // Logistics Partners
  getLogisticsPartners: async () => {
    const response = await api.get('/logistics-partners');
    return response.data || [];
  },
  updateLogisticsPartner: async (id, partnerData) => {
    const response = await api.put(`/logistics-partners/${id}`, partnerData);
    return response.data;
  },
};

// Analytics & BI API
export const analyticsAPI = {
  // Event Ingestion
  trackEvent: async (eventData) => {
    const response = await api.post('/analytics/events', eventData);
    return response.data;
  },
  trackEventsBatch: async (events) => {
    const response = await api.post('/analytics/events/batch', { events });
    return response.data;
  },
  getEvents: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.eventType) queryParams.append('eventType', params.eventType);
    if (params.entityType) queryParams.append('entityType', params.entityType);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit);
    const queryString = queryParams.toString();
    const url = queryString ? `/analytics/events?${queryString}` : '/analytics/events';
    const response = await api.get(url);
    return response.data || [];
  },
  
  // Dashboards
  getDashboard: async (type, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.period) queryParams.append('period', params.period);
    const queryString = queryParams.toString();
    const url = queryString 
      ? `/analytics/dashboard/${type}?${queryString}` 
      : `/analytics/dashboard/${type}`;
    const response = await api.get(url);
    return response.data || {};
  },
  getSalesDashboard: async (params = {}) => {
    return analyticsAPI.getDashboard('sales', params);
  },
  getInventoryDashboard: async (params = {}) => {
    return analyticsAPI.getDashboard('inventory', params);
  },
  getOrdersDashboard: async (params = {}) => {
    return analyticsAPI.getDashboard('orders', params);
  },
  getReceivablesDashboard: async (params = {}) => {
    return analyticsAPI.getDashboard('receivables', params);
  },
  getOverviewDashboard: async (params = {}) => {
    return analyticsAPI.getDashboard('overview', params);
  },
};

export const paymentAPI = {
  // Payment Gateways
  getGateways: async () => {
    const response = await api.get('/payment-gateways');
    return response.data;
  },
  getGateway: async (id) => {
    const response = await api.get(`/payment-gateways/${id}`);
    return response.data;
  },
  createGateway: async (gateway) => {
    const response = await api.post('/payment-gateways', gateway);
    return response.data;
  },
  updateGateway: async (id, gateway) => {
    const response = await api.put(`/payment-gateways/${id}`, gateway);
    return response.data;
  },
  deleteGateway: async (id) => {
    const response = await api.delete(`/payment-gateways/${id}`);
    return response.data;
  },

  // Payment Tokens
  getTokens: async (userId = null) => {
    const url = userId ? `/payment-tokens?userId=${userId}` : '/payment-tokens';
    const response = await api.get(url);
    return response.data;
  },
  createToken: async (token) => {
    const response = await api.post('/payment-tokens', token);
    return response.data;
  },
  deleteToken: async (id) => {
    const response = await api.delete(`/payment-tokens/${id}`);
    return response.data;
  },

  // Payments
  getPayments: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.orderId) queryParams.append('orderId', params.orderId);
    if (params.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
    if (params.gatewayId) queryParams.append('gatewayId', params.gatewayId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const queryString = queryParams.toString();
    const url = `/payments${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  getPayment: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },
  createPayment: async (payment) => {
    const response = await api.post('/payments', payment);
    return response.data;
  },
  updatePaymentStatus: async (id, statusData) => {
    const response = await api.put(`/payments/${id}/status`, statusData);
    return response.data;
  },
  getPaymentStatistics: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.gatewayId) queryParams.append('gatewayId', params.gatewayId);
    const queryString = queryParams.toString();
    const url = `/payments/statistics${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response.data;
  },

  // Payment Transactions
  getTransactions: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.paymentId) queryParams.append('paymentId', params.paymentId);
    if (params.transactionType) queryParams.append('transactionType', params.transactionType);
    if (params.status) queryParams.append('status', params.status);
    const response = await api.get(`/payment-transactions?${queryParams.toString()}`);
    return response.data;
  },
  createTransaction: async (transaction) => {
    const response = await api.post('/payment-transactions', transaction);
    return response.data;
  },

  // Refunds
  getRefunds: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.paymentId) queryParams.append('paymentId', params.paymentId);
    if (params.orderId) queryParams.append('orderId', params.orderId);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.refundStatus) queryParams.append('refundStatus', params.refundStatus);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const queryString = queryParams.toString();
    const url = `/refunds${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  createRefund: async (refund) => {
    const response = await api.post('/refunds', refund);
    return response.data;
  },
  updateRefundStatus: async (id, statusData) => {
    const response = await api.put(`/refunds/${id}/status`, statusData);
    return response.data;
  },

  // Invoices
  getInvoices: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.orderId) queryParams.append('orderId', params.orderId);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.invoiceStatus) queryParams.append('invoiceStatus', params.invoiceStatus);
    if (params.invoiceType) queryParams.append('invoiceType', params.invoiceType);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const queryString = queryParams.toString();
    const url = `/invoices${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  getInvoice: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },
  createInvoice: async (invoice) => {
    const response = await api.post('/invoices', invoice);
    return response.data;
  },
  updateInvoice: async (id, invoice) => {
    const response = await api.put(`/invoices/${id}`, invoice);
    return response.data;
  },

  // Reconciliations
  getReconciliations: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.gatewayId) queryParams.append('gatewayId', params.gatewayId);
    if (params.reconciliationStatus) queryParams.append('reconciliationStatus', params.reconciliationStatus);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const queryString = queryParams.toString();
    const url = `/reconciliations${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  createReconciliation: async (reconciliation) => {
    const response = await api.post('/reconciliations', reconciliation);
    return response.data;
  },
  updateReconciliationStatus: async (id, statusData) => {
    const response = await api.put(`/reconciliations/${id}/status`, statusData);
    return response.data;
  },

  // Accounting Exports
  getAccountingExports: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.exportType) queryParams.append('exportType', params.exportType);
    if (params.exportStatus) queryParams.append('exportStatus', params.exportStatus);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const queryString = queryParams.toString();
    const url = `/accounting-exports${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  createAccountingExport: async (exportData) => {
    const response = await api.post('/accounting-exports', exportData);
    return response.data;
  },
  updateAccountingExportStatus: async (id, statusData) => {
    const response = await api.put(`/accounting-exports/${id}/status`, statusData);
    return response.data;
  },

  // Payment Webhooks
  getWebhooks: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.gatewayId) queryParams.append('gatewayId', params.gatewayId);
    if (params.eventType) queryParams.append('eventType', params.eventType);
    if (params.isProcessed !== undefined) queryParams.append('isProcessed', params.isProcessed);
    const response = await api.get(`/payment-webhooks?${queryParams.toString()}`);
    return response.data;
  },
};

// Audit Events API
export const auditEventsAPI = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.user) queryParams.append('user', params.user);
    if (params.action) queryParams.append('action', params.action);
    if (params.resource) queryParams.append('resource', params.resource);
    if (params.resource_id) queryParams.append('resource_id', params.resource_id);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    const queryString = queryParams.toString();
    const url = queryString ? `/audit-events?${queryString}` : '/audit-events';
    const response = await api.get(url);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/audit-events/${id}`);
    return response.data;
  },
  create: async (eventData) => {
    const response = await api.post('/audit-events', eventData);
    return response.data;
  },
  getUniqueFilters: async () => {
    const response = await api.get('/audit-events/filters/unique');
    return response.data;
  },
};
