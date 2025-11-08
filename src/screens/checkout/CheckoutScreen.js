import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { addresses, paymentMethods } from '../../constants/data';
import { ordersAPI, pricingAPI } from '../../services/api';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../utils/storage';

const CheckoutScreen = ({ navigation }) => {
  const [cart, setCart] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  // Pricing breakdown
  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  
  // Credit limit
  const [creditLimit, setCreditLimit] = useState(null);
  const [creditAvailable, setCreditAvailable] = useState(0);

  useEffect(() => {
    loadCart();
    loadAddresses();
    loadCreditLimit();
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      calculatePricing();
    }
  }, [cart, appliedPromo, selectedAddress]);

  const loadCart = async () => {
    const cartData = await storage.getItem(StorageKeys.CART) || [];
    setCart(cartData);
  };

  const loadCreditLimit = async () => {
    try {
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = JSON.parse(userData);
        if (user.id) {
          const limit = await pricingAPI.getCreditLimit(user.id);
          if (limit) {
            setCreditLimit(limit);
            setCreditAvailable(limit.availableCredit || limit.creditLimit || 0);
          }
        }
      }
    } catch (error) {
      console.error('Error loading credit limit:', error);
    }
  };

  const calculatePricing = async () => {
    if (cart.length === 0) return;
    
    try {
      setCalculating(true);
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      const user = userData ? JSON.parse(userData) : {};
      
      // Prepare items for pricing calculation
      const items = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
        categoryId: item.categoryId || null,
      }));

      // Get state code from address
      const stateCode = selectedAddress?.state || null;

      // Calculate pricing using the pricing engine
      const pricing = await pricingAPI.calculatePricing(
        user.id || 1,
        items,
        appliedPromo?.code || null,
        stateCode
      );

      setSubtotal(pricing.totalAmount || 0);
      setTotalDiscount(pricing.totalDiscount || 0);
      setPromoDiscount(pricing.promoDiscount || 0);
      setTotalTax(pricing.totalTax || 0);
      
      // Calculate delivery charge (free above 499)
      const amountAfterDiscount = pricing.totalAmount - pricing.totalDiscount;
      const delivery = amountAfterDiscount > 499 ? 0 : 50;
      setDeliveryCharge(delivery);
      
      // Final total
      const finalTotal = pricing.finalAmount + delivery;
      setTotal(finalTotal);
      
      // Check credit limit
      if (creditLimit) {
        const availableCredit = creditLimit.availableCredit || creditLimit.creditLimit || 0;
        setCreditAvailable(availableCredit);
        
        if (selectedPayment?.id === 'credit' && finalTotal > availableCredit) {
          Alert.alert(
            'Credit Limit Exceeded',
            `Your available credit (₹${availableCredit.toFixed(2)}) is less than the order amount (₹${finalTotal.toFixed(2)}). Please select a different payment method or reduce order quantity.`
          );
        }
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
      // Fallback to simple calculation
      const subtotalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      setSubtotal(subtotalAmount);
      setTotalDiscount(0);
      setPromoDiscount(0);
      setTotalTax(0);
      setDeliveryCharge(subtotalAmount > 499 ? 0 : 50);
      setTotal(subtotalAmount + (subtotalAmount > 499 ? 0 : 50));
    } finally {
      setCalculating(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    try {
      setPromoError('');
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      const user = userData ? JSON.parse(userData) : {};
      
      const orderAmount = subtotal - totalDiscount;
      const productIds = cart.map(item => item.id);
      const categoryIds = cart.map(item => item.categoryId).filter(Boolean);

      const validation = await pricingAPI.validatePromoCode(
        promoCode.toUpperCase(),
        user.id || 1,
        orderAmount,
        productIds,
        categoryIds
      );

      if (validation.valid) {
        setAppliedPromo(validation.promoCode);
        Alert.alert('Success', 'Promo code applied successfully!');
        // Recalculate pricing with promo code
        calculatePricing();
      } else {
        setPromoError('Invalid or expired promo code');
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      setPromoError(error.message || 'Failed to apply promo code');
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
    calculatePricing();
  };

  const loadAddresses = async () => {
    const savedAddresses = await storage.getItem(StorageKeys.ADDRESSES) || addresses;
    const defaultAddress = savedAddresses.find(addr => addr.isDefault) || savedAddresses[0];
    setSelectedAddress(defaultAddress);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    // Check credit limit for credit payment
    if (selectedPayment.id === 'credit' && creditLimit) {
      if (total > creditAvailable) {
        Alert.alert(
          'Credit Limit Exceeded',
          `Your available credit (₹${creditAvailable.toFixed(2)}) is less than the order amount (₹${total.toFixed(2)}). Please select a different payment method.`
        );
        return;
      }
    }

    try {
      setLoading(true);
      // Get user data for retailer info
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      const user = userData ? JSON.parse(userData) : {};

      const order = {
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          price: item.price,
          name: item.name,
          id: item.id,
        })),
        userId: user.id || 1,
        shippingAddress: JSON.stringify(selectedAddress),
        billingAddress: JSON.stringify(selectedAddress),
        paymentMethod: selectedPayment,
        subtotal,
        discount: totalDiscount,
        promoDiscount,
        tax: totalTax,
        deliveryCharge,
        shippingAmount: deliveryCharge,
        total,
        promoCode: appliedPromo?.code || null,
        status: 'pending',
        retailerName: user.storeName || user.name || 'Retailer',
        storeName: user.storeName,
        storeType: user.storeType,
        phone: user.phone,
        email: user.email,
        createdAt: new Date().toISOString(),
      };

      // Save to shared API (admin panel)
      await ordersAPI.create(order);

      // Also save to local storage for mobile app
      const orders = await storage.getItem(StorageKeys.ORDERS) || [];
      orders.unshift({ ...order, id: Date.now() });
      await storage.setItem(StorageKeys.ORDERS, orders);
      await storage.setItem(StorageKeys.CART, []);

      // Clear promo code
      setAppliedPromo(null);
      setPromoCode('');

      Alert.alert(
        'Purchase Order Created!',
        'Your purchase order has been submitted successfully. You will receive a confirmation shortly.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('OrdersTab'),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Purchase Order</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery to Store</Text>
          {selectedAddress && (
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressName}>{selectedAddress.name}</Text>
                <TouchableOpacity>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressText}>
                {selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
              </Text>
              <Text style={styles.addressPhone}>{selectedAddress.phone}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchase Order Summary</Text>
          {cart.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.name} x {item.quantity}</Text>
                <Text style={styles.orderItemUnitPrice}>₹{item.price} per unit</Text>
              </View>
              <Text style={styles.orderItemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Promo Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promo Code</Text>
          {appliedPromo ? (
            <View style={styles.promoApplied}>
              <View>
                <Text style={styles.promoCodeText}>Applied: {appliedPromo.code}</Text>
                <Text style={styles.promoDiscountText}>
                  Discount: ₹{promoDiscount.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemovePromoCode}>
                <Text style={styles.removePromoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter promo code"
                value={promoCode}
                onChangeText={(text) => {
                  setPromoCode(text);
                  setPromoError('');
                }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.applyPromoButton}
                onPress={handleApplyPromoCode}
              >
                <Text style={styles.applyPromoText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}
          {promoError ? (
            <Text style={styles.promoError}>{promoError}</Text>
          ) : null}
        </View>

        {/* Credit Limit Info */}
        {creditLimit && selectedPayment?.id === 'credit' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Limit</Text>
            <View style={styles.creditInfo}>
              <Text style={styles.creditLabel}>Available Credit:</Text>
              <Text style={[styles.creditAmount, total > creditAvailable && styles.creditExceeded]}>
                ₹{creditAvailable.toFixed(2)}
              </Text>
            </View>
            {total > creditAvailable && (
              <Text style={styles.creditWarning}>
                Order amount exceeds available credit. Please select a different payment method.
              </Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentCard,
                selectedPayment?.id === method.id && styles.paymentCardSelected,
              ]}
              onPress={() => setSelectedPayment(method)}
            >
              <Icon name={method.icon} size={24} color={colors.primary} />
              <Text style={styles.paymentName}>{method.name}</Text>
              {selectedPayment?.id === method.id && (
                <Icon name="check-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Discount</Text>
              <Text style={[styles.priceValue, styles.discountText]}>
                -₹{totalDiscount.toFixed(2)}
              </Text>
            </View>
          )}
          {totalTax > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax (GST)</Text>
              <Text style={styles.priceValue}>₹{totalTax.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Charge</Text>
            <Text style={styles.priceValue}>
              {deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge.toFixed(2)}`}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            {calculating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total: </Text>
          {calculating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.footerTotalValue}>₹{total.toFixed(2)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, (loading || calculating) && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading || calculating}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.placeOrderButtonText}>Create Purchase Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    backgroundColor: colors.white,
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  changeText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  addressPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  orderItemUnitPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  applyPromoButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyPromoText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  promoApplied: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
  },
  promoCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  promoDiscountText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  removePromoText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  promoError: {
    fontSize: 12,
    color: colors.error,
    marginTop: 8,
  },
  creditInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  creditLabel: {
    fontSize: 14,
    color: colors.text,
  },
  creditAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  creditExceeded: {
    color: colors.error,
  },
  creditWarning: {
    fontSize: 12,
    color: colors.error,
    marginTop: 8,
  },
  discountText: {
    color: colors.success || colors.primary,
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 16,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerTotal: {
    flex: 1,
    justifyContent: 'center',
  },
  footerTotalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  placeOrderButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  placeOrderButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;

