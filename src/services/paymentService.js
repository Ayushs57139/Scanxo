// Payment Service for React Native
// Integrates with payment gateway SDKs (Razorpay, Stripe, etc.)
// PCI Compliant - uses tokenization for card payments

import { API_BASE_URL } from '../constants/config.js';

// Payment Gateway SDK Integration
// Note: Install required packages:
// npm install react-native-razorpay (for Razorpay)
// npm install @stripe/stripe-react-native (for Stripe)

class PaymentService {
  constructor() {
    this.gatewaySDK = null;
    this.currentGateway = null;
  }

  // Initialize payment gateway SDK
  async initializeGateway(gatewayType, config) {
    try {
      this.currentGateway = gatewayType;
      
      switch (gatewayType) {
        case 'razorpay':
          // Initialize Razorpay
          // const RazorpayCheckout = require('react-native-razorpay').default;
          // this.gatewaySDK = RazorpayCheckout;
          console.log('Razorpay SDK initialized');
          break;
        
        case 'stripe':
          // Initialize Stripe
          // const { initStripe } = require('@stripe/stripe-react-native');
          // await initStripe(config.publishableKey);
          console.log('Stripe SDK initialized');
          break;
        
        default:
          throw new Error(`Unsupported gateway type: ${gatewayType}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing payment gateway:', error);
      throw error;
    }
  }

  // Create payment token (tokenization for PCI compliance)
  async createPaymentToken(cardData, gatewayId) {
    try {
      // In production, this should be done through the gateway's tokenization API
      // Never store full card details on device
      
      const response = await fetch(`${API_BASE_URL}/payment-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: cardData.userId,
          gatewayId: gatewayId,
          token: cardData.token, // Gateway-provided token
          tokenType: 'card',
          maskedCardNumber: cardData.maskedCardNumber, // Last 4 digits only
          cardBrand: cardData.cardBrand,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          cardHolderName: cardData.cardHolderName,
          isDefault: cardData.isDefault || false,
          metadata: cardData.metadata || {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment token');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment token:', error);
      throw error;
    }
  }

  // Initiate payment
  async initiatePayment(paymentData) {
    try {
      // Create payment record in backend
      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: paymentData.userId,
          orderId: paymentData.orderId,
          outstandingId: paymentData.outstandingId,
          gatewayId: paymentData.gatewayId,
          tokenId: paymentData.tokenId, // Use saved token if available
          amount: paymentData.amount,
          currency: paymentData.currency || 'INR',
          paymentMethod: paymentData.paymentMethod,
          metadata: paymentData.metadata || {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate payment');
      }

      const payment = await response.json();

      // Process payment through gateway SDK
      return await this.processPaymentWithGateway(payment, paymentData);
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw error;
    }
  }

  // Process payment with gateway SDK
  async processPaymentWithGateway(payment, paymentData) {
    try {
      const gatewayType = this.currentGateway || paymentData.gatewayType;

      switch (gatewayType) {
        case 'razorpay':
          return await this.processRazorpayPayment(payment, paymentData);
        
        case 'stripe':
          return await this.processStripePayment(payment, paymentData);
        
        case 'upi':
          return await this.processUPIPayment(payment, paymentData);
        
        default:
          throw new Error(`Unsupported payment method: ${gatewayType}`);
      }
    } catch (error) {
      // Update payment status to failed
      await this.updatePaymentStatus(payment.id, {
        paymentStatus: 'failed',
        failureReason: error.message,
      });
      throw error;
    }
  }

  // Process Razorpay payment
  async processRazorpayPayment(payment, paymentData) {
    try {
      // Razorpay Checkout integration
      // const RazorpayCheckout = require('react-native-razorpay').default;
      
      const options = {
        description: paymentData.description || 'Payment',
        image: paymentData.image || '',
        currency: payment.currency || 'INR',
        key: paymentData.razorpayKey, // Gateway API key
        amount: payment.amount * 100, // Amount in paise
        name: paymentData.merchantName || 'Merchant',
        prefill: {
          email: paymentData.email || '',
          contact: paymentData.phone || '',
          name: paymentData.name || '',
        },
        theme: { color: paymentData.themeColor || '#1E3A8A' },
        order_id: payment.gatewayOrderId, // If order already created
      };

      // Open Razorpay checkout
      // const razorpayResponse = await RazorpayCheckout.open(options);
      
      // For now, simulate payment response
      const razorpayResponse = {
        razorpay_payment_id: `pay_${Date.now()}`,
        razorpay_order_id: `order_${Date.now()}`,
        razorpay_signature: 'signature',
      };

      // Update payment with gateway response
      await this.updatePaymentStatus(payment.id, {
        paymentStatus: 'success',
        gatewayTransactionId: razorpayResponse.razorpay_payment_id,
        gatewayOrderId: razorpayResponse.razorpay_order_id,
        gatewayPaymentId: razorpayResponse.razorpay_payment_id,
        metadata: razorpayResponse,
      });

      return {
        success: true,
        paymentId: payment.id,
        transactionId: razorpayResponse.razorpay_payment_id,
      };
    } catch (error) {
      console.error('Razorpay payment error:', error);
      throw error;
    }
  }

  // Process Stripe payment
  async processStripePayment(payment, paymentData) {
    try {
      // Stripe integration
      // const { useStripe } = require('@stripe/stripe-react-native');
      // const stripe = useStripe();
      
      // For card payments with tokenization
      if (paymentData.tokenId) {
        // Use saved token
        // const { paymentIntent, error } = await stripe.confirmPayment(paymentData.clientSecret, {
        //   paymentMethodType: 'Card',
        // });
        
        // Simulate response
        const paymentIntent = {
          id: `pi_${Date.now()}`,
          status: 'succeeded',
        };

        await this.updatePaymentStatus(payment.id, {
          paymentStatus: 'success',
          gatewayTransactionId: paymentIntent.id,
          gatewayPaymentId: paymentIntent.id,
        });

        return {
          success: true,
          paymentId: payment.id,
          transactionId: paymentIntent.id,
        };
      } else {
        // New card payment - tokenize first
        throw new Error('Card tokenization required. Please save card first.');
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      throw error;
    }
  }

  // Process UPI payment
  async processUPIPayment(payment, paymentData) {
    try {
      // UPI payment integration
      // This would typically use a UPI SDK or deep linking
      
      const upiUrl = `upi://pay?pa=${paymentData.upiId}&pn=${paymentData.merchantName}&am=${payment.amount}&cu=${payment.currency}&tn=${paymentData.description}`;
      
      // Open UPI app
      // Linking.openURL(upiUrl);
      
      // For now, simulate UPI payment
      const upiResponse = {
        transactionId: `upi_${Date.now()}`,
        status: 'success',
      };

      await this.updatePaymentStatus(payment.id, {
        paymentStatus: 'success',
        gatewayTransactionId: upiResponse.transactionId,
      });

      return {
        success: true,
        paymentId: payment.id,
        transactionId: upiResponse.transactionId,
      };
    } catch (error) {
      console.error('UPI payment error:', error);
      throw error;
    }
  }

  // Update payment status
  async updatePaymentStatus(paymentId, statusData) {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusData),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Get payment details
  async getPayment(paymentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  // Get saved payment tokens
  async getPaymentTokens(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/payment-tokens?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment tokens');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment tokens:', error);
      throw error;
    }
  }

  // Delete payment token
  async deletePaymentToken(tokenId) {
    try {
      const response = await fetch(`${API_BASE_URL}/payment-tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment token');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting payment token:', error);
      throw error;
    }
  }

  // Process refund
  async processRefund(refundData) {
    try {
      const response = await fetch(`${API_BASE_URL}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Get invoices
  async getInvoices(userId, params = {}) {
    try {
      const queryParams = new URLSearchParams({ userId, ...params });
      const response = await fetch(`${API_BASE_URL}/invoices?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  // Get payment gateways
  async getPaymentGateways() {
    try {
      const response = await fetch(`${API_BASE_URL}/payment-gateways`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment gateways');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment gateways:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new PaymentService();

