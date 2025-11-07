import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { addresses, paymentMethods } from '../../constants/data';
import { ordersAPI } from '../../services/api';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../utils/storage';

const CheckoutScreen = ({ navigation }) => {
  const [cart, setCart] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCart();
    loadAddresses();
  }, []);

  const loadCart = async () => {
    const cartData = await storage.getItem(StorageKeys.CART) || [];
    setCart(cartData);
    const subtotalAmount = cartData.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setSubtotal(subtotalAmount);
    setDeliveryCharge(subtotalAmount > 499 ? 0 : 50);
    setTotal(subtotalAmount + (subtotalAmount > 499 ? 0 : 50));
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

    try {
      // Get user data for retailer info
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      const user = userData ? JSON.parse(userData) : {};

      const order = {
        items: cart,
        address: selectedAddress,
        paymentMethod: selectedPayment,
        subtotal,
        deliveryCharge,
        total,
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
              <Text style={styles.orderItemName}>{item.name} x {item.quantity}</Text>
              <Text style={styles.orderItemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

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
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Charge</Text>
            <Text style={styles.priceValue}>
              {deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total: </Text>
          <Text style={styles.footerTotalValue}>₹{total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.placeOrderButton} onPress={handlePlaceOrder}>
          <Text style={styles.placeOrderButtonText}>Create Purchase Order</Text>
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
  orderItemName: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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

