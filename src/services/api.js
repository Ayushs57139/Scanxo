// Shared API service for mobile app
// Uses MySQL database through Express API (server/index.js)
import { API_BASE_URL } from '../constants/config';

// Products API - MySQL only
export const productsAPI = {
  getAll: async () => {
    try {
      console.log('Fetching products from:', `${API_BASE_URL}/products`);
      
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('Products API response status:', res.status, res.statusText);
      
      if (!res.ok) {
        console.error('Products API response not OK:', res.status, res.statusText);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Products fetched successfully:', data?.length || 0, 'products');
      if (data && data.length > 0) {
        console.log('First product sample:', {
          id: data[0].id,
          name: data[0].name,
          price: data[0].price,
          isTrending: data[0].isTrending
        });
      }
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // Log all errors for debugging
      if (error.name === 'AbortError') {
        // Timeout is expected when server is not accessible, use debug log
        console.log('Products fetch timeout - using fallback data');
      } else {
        console.error('Error fetching products:', error.message || error);
        console.error('Error type:', error.name);
      }
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return await res.json();
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },
  
  getTrending: async () => {
    try {
      console.log('Fetching trending products from:', `${API_BASE_URL}/products/trending`);
      
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await fetch(`${API_BASE_URL}/products/trending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('Trending products API response status:', res.status, res.statusText);
      
      if (!res.ok) {
        console.error('Trending products API response not OK:', res.status, res.statusText);
        throw new Error(`Failed to fetch trending products: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Trending products fetched successfully:', data?.length || 0, 'products');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // Log all errors for debugging
      if (error.name === 'AbortError') {
        // Timeout is expected when server is not accessible, use debug log
        console.log('Trending products fetch timeout - using fallback data');
      } else {
        console.error('Error fetching trending products:', error.message || error);
      }
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },
};

// Categories API - MySQL only
export const categoriesAPI = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch categories');
      return await res.json();
    } catch (error) {
      // Only log error if it's not a network error (server might not be running)
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching categories:', error);
      }
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },
};

// Banners API - MySQL only
export const bannersAPI = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/banners`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch banners');
      return await res.json();
    } catch (error) {
      // Only log error if it's not a network error (server might not be running)
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching banners:', error);
      }
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },
  
  getSpecialOffers: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/banners/special-offers`);
      if (!res.ok) throw new Error('Failed to fetch special offers');
      return await res.json();
    } catch (error) {
      console.error('Error fetching special offers:', error);
      throw error;
    }
  },
};

// Orders API - MySQL only
export const ordersAPI = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return await res.json();
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },
  
  create: async (order) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error('Failed to create order');
      return await res.json();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      return await res.json();
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },
};

// Distributors API - MySQL only
export const distributorsAPI = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/distributors`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch distributors');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching distributors:', error);
      }
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/distributors/${id}`);
      if (!res.ok) throw new Error('Failed to fetch distributor');
      return await res.json();
    } catch (error) {
      console.error('Error fetching distributor:', error);
      throw error;
    }
  },
  
  create: async (distributor) => {
    try {
      const res = await fetch(`${API_BASE_URL}/distributors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(distributor),
      });
      if (!res.ok) throw new Error('Failed to create distributor');
      return await res.json();
    } catch (error) {
      console.error('Error creating distributor:', error);
      throw error;
    }
  },
  
  update: async (id, distributor) => {
    try {
      const res = await fetch(`${API_BASE_URL}/distributors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(distributor),
      });
      if (!res.ok) throw new Error('Failed to update distributor');
      return await res.json();
    } catch (error) {
      console.error('Error updating distributor:', error);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/distributors/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete distributor');
      return await res.json();
    } catch (error) {
      console.error('Error deleting distributor:', error);
      throw error;
    }
  },
};

// Rewards API
export const rewardsAPI = {
  getRewards: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rewards/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch rewards');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching rewards:', error);
      }
      return { points: 0, totalEarned: 0, totalRedeemed: 0, tier: 'Bronze', status: 'active' };
    }
  },
  
  getHistory: async (userId, type = null) => {
    try {
      let url = `${API_BASE_URL}/rewards/${userId}/history`;
      if (type) {
        url += `?type=${type}`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch reward history');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching reward history:', error);
      }
      return [];
    }
  },
  
  earnPoints: async (userId, points, description, orderId = null, transactionId = null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rewards/${userId}/earn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points, description, orderId, transactionId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to earn points');
      }
      return await res.json();
    } catch (error) {
      console.error('Error earning points:', error);
      throw error;
    }
  },
  
  redeemPoints: async (userId, points, description, transactionId = null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rewards/${userId}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points, description, transactionId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to redeem points');
      }
      return await res.json();
    } catch (error) {
      console.error('Error redeeming points:', error);
      throw error;
    }
  },
};

// Outstanding API
export const outstandingAPI = {
  getAll: async (userId, status = null) => {
    try {
      let url = `${API_BASE_URL}/outstanding/${userId}`;
      if (status) {
        url += `?status=${status}`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch outstanding');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching outstanding:', error);
      }
      return [];
    }
  },
  
  getSummary: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/outstanding/${userId}/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch outstanding summary');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching outstanding summary:', error);
      }
      return {
        totalAmount: 0,
        totalPending: 0,
        totalCleared: 0,
        totalCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        clearedCount: 0
      };
    }
  },
  
  getHistory: async (outstandingId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/outstanding/${outstandingId}/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch outstanding history');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching outstanding history:', error);
      }
      return [];
    }
  },
  
  makePayment: async (userId, outstandingId, amount, paymentMethod, transactionId, description, paymentDate) => {
    try {
      const res = await fetch(`${API_BASE_URL}/outstanding/${userId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outstandingId, amount, paymentMethod, transactionId, description, paymentDate }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process payment');
      }
      return await res.json();
    } catch (error) {
      console.error('Error making payment:', error);
      throw error;
    }
  },
};

// KYC API
export const kycAPI = {
  // Profiles
  getProfile: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/profiles/user/${userId}`);
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error('Error fetching KYC profile:', e);
      return null;
    }
  },
  
  createProfile: async (profile) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) return await res.json();
      throw new Error('Failed to create profile');
    } catch (e) {
      console.error('Error creating KYC profile:', e);
      throw e;
    }
  },
  
  updateProfile: async (id, profile) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) return await res.json();
      throw new Error('Failed to update profile');
    } catch (e) {
      console.error('Error updating KYC profile:', e);
      throw e;
    }
  },
  
  // Documents
  getDocuments: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/documents?userId=${userId}`);
      if (res.ok) return await res.json();
      return [];
    } catch (e) {
      console.error('Error fetching documents:', e);
      return [];
    }
  },
  
  uploadDocuments: async (userId, documentType, files) => {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.name || `document-${index}.jpg`,
        });
      });
      formData.append('userId', userId);
      formData.append('documentType', documentType);
      
      const res = await fetch(`${API_BASE_URL}/kyc/documents`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.ok) return await res.json();
      throw new Error('Failed to upload documents');
    } catch (e) {
      console.error('Error uploading documents:', e);
      throw e;
    }
  },
  
  // Business License
  getBusinessLicense: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/business-license/${userId}`);
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error('Error fetching business license:', e);
      return null;
    }
  },
  
  updateBusinessLicense: async (userId, licenseData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/business-license/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(licenseData),
      });
      if (res.ok) return await res.json();
      throw new Error('Failed to update business license');
    } catch (e) {
      console.error('Error updating business license:', e);
      throw e;
    }
  },
  
  // GST Info
  getGSTInfo: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/gst/${userId}`);
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error('Error fetching GST info:', e);
      return null;
    }
  },
  
  updateGSTInfo: async (userId, gstData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/gst/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gstData),
      });
      if (res.ok) return await res.json();
      throw new Error('Failed to update GST info');
    } catch (e) {
      console.error('Error updating GST info:', e);
      throw e;
    }
  },
  
  // Credit Limit
  getCreditLimit: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/credit-limit/${userId}`);
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error('Error fetching credit limit:', e);
      return null;
    }
  },
  
  // eKYC Verification
  verifyWithEKYC: async (userId, provider, documentType, documentData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/ekyc/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, provider, documentType, documentData }),
      });
      if (res.ok) return await res.json();
      throw new Error('eKYC verification failed');
    } catch (e) {
      console.error('Error with eKYC verification:', e);
      throw e;
    }
  },
};

// Company Offers API
export const companyOffersAPI = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/company-offers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch company offers');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching company offers:', error);
      }
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/company-offers/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch company offer');
      return await res.json();
    } catch (error) {
      console.error('Error fetching company offer:', error);
      throw error;
    }
  },
};

// Feedback API
export const feedbackAPI = {
  create: async (feedback) => {
    try {
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      return await res.json();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },
  
  getByUserId: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/feedback/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch feedback');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching feedback:', error);
      }
      return [];
    }
  },
};

// Favorites API
export const favoritesAPI = {
  getByUserId: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/favorites/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch favorites');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching favorites:', error);
      }
      return [];
    }
  },
  
  add: async (userId, productId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, productId }),
      });
      if (!res.ok) throw new Error('Failed to add favorite');
      return await res.json();
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  },
  
  remove: async (userId, productId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/favorites/${userId}/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to remove favorite');
      return await res.json();
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  },
};

// Retailer Auth API
export const retailerAuthAPI = {
  register: async (registrationData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/retailers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      return data;
    } catch (error) {
      console.error('Error registering retailer:', error);
      throw error;
    }
  },

  login: async (phone, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/retailers/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Login failed');
      }
      return data;
    } catch (error) {
      console.error('Error logging in retailer:', error);
      throw error;
    }
  },
};

// Auth API
export const authAPI = {
  changePassword: async (userId, oldPassword, newPassword) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, oldPassword, newPassword }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to change password');
      }
      return await res.json();
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },
};

// Pricing API
export const pricingAPI = {
  // Calculate pricing
  calculatePricing: async (userId, items, promoCode = null, stateCode = null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/pricing/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          items,
          promoCode,
          stateCode,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to calculate pricing');
      }
      return await res.json();
    } catch (error) {
      console.error('Error calculating pricing:', error);
      throw error;
    }
  },

  // Validate promo code
  validatePromoCode: async (code, userId, orderAmount, productIds = [], categoryIds = []) => {
    try {
      const res = await fetch(`${API_BASE_URL}/promo-codes/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          userId,
          orderAmount,
          productIds,
          categoryIds,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Invalid promo code');
      }
      return await res.json();
    } catch (error) {
      console.error('Error validating promo code:', error);
      throw error;
    }
  },

  // Get credit limit
  getCreditLimit: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/credit-limits/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        // Credit limit might not exist, return null
        return null;
      }
      return await res.json();
    } catch (error) {
      console.error('Error fetching credit limit:', error);
      return null;
    }
  },
};

// Notifications API
export const notificationsAPI = {
  getByUserId: async (userId, unreadOnly = false) => {
    try {
      const url = unreadOnly 
        ? `${API_BASE_URL}/notifications/user/${userId}?unreadOnly=true`
        : `${API_BASE_URL}/notifications/user/${userId}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching notifications:', error);
      }
      return [];
    }
  },
  
  getUnreadCount: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/user/${userId}/unread-count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch unread count');
      return await res.json();
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('Error fetching unread count:', error);
      }
      return { count: 0 };
    }
  },
  
  markAsRead: async (notificationId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to mark notification as read');
      return await res.json();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
  
  markAllAsRead: async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/user/${userId}/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to mark all notifications as read');
      return await res.json();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },
  
  create: async (notification) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });
      if (!res.ok) throw new Error('Failed to create notification');
      return await res.json();
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },
};

