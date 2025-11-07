import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../utils/storage';
import { favoritesAPI } from '../../services/api';

const ProductDetailScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const [quantity, setQuantity] = useState(product.moq || 1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserAndFavoriteStatus();
  }, []);

  const loadUserAndFavoriteStatus = async () => {
    try {
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        const currentUserId = user.id || user.phone || 'default';
        setUserId(currentUserId);
        
        if (currentUserId && currentUserId !== 'default') {
          try {
            const favorites = await favoritesAPI.getByUserId(currentUserId);
            const isFav = favorites.some(fav => fav.productId === product.id || fav.id === product.id);
            setIsFavorite(isFav);
          } catch (error) {
            console.error('Error loading favorite status:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userId || userId === 'default') {
      Alert.alert('Login Required', 'Please login to add items to favorites');
      return;
    }

    try {
      if (isFavorite) {
        Alert.alert(
          'Remove from Favorites',
          `Are you sure you want to remove "${product.name}" from favorites?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                try {
                  await favoritesAPI.remove(userId, product.id);
                  setIsFavorite(false);
                  Alert.alert('Success', 'Removed from favorites');
                } catch (error) {
                  console.error('Error removing favorite:', error);
                  Alert.alert('Error', 'Failed to remove from favorites');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Add to Favorites',
          `Add "${product.name}" to your favorites?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add',
              onPress: async () => {
                try {
                  await favoritesAPI.add(userId, product.id);
                  setIsFavorite(true);
                  Alert.alert('Success', 'Added to favorites');
                } catch (error) {
                  console.error('Error adding favorite:', error);
                  Alert.alert('Error', 'Failed to add to favorites');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAddToCart = async () => {
    const moq = product.moq || 100; // Default MOQ for B2B
    
    if (quantity < moq) {
      Alert.alert('Minimum Order Quantity', `Minimum order quantity is ${moq} ${product.unit || 'units'}. Please order in bulk.`);
      setQuantity(moq);
      return;
    }
    
    Alert.alert(
      'Add to Cart',
      `Add ${quantity} ${product.unit || 'units'} of "${product.name}" to cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            const cart = await storage.getItem(StorageKeys.CART) || [];
            const existingItem = cart.find(item => item.id === product.id);
            
            if (existingItem) {
              existingItem.quantity += quantity;
            } else {
              cart.push({ ...product, quantity });
            }
            
            await storage.setItem(StorageKeys.CART, cart);
            Alert.alert('Success', 'Product added to cart!');
          },
        },
      ]
    );
  };

  const handleBuyNow = async () => {
    const moq = product.moq || 100; // Default MOQ for B2B
    
    if (quantity < moq) {
      Alert.alert('Minimum Order Quantity', `Minimum order quantity is ${moq} ${product.unit || 'units'}. Please order in bulk.`);
      setQuantity(moq);
      return;
    }
    
    Alert.alert(
      'Order Now',
      `Place order for ${quantity} ${product.unit || 'units'} of "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Order',
          onPress: async () => {
            const cart = await storage.getItem(StorageKeys.CART) || [];
            const existingItem = cart.find(item => item.id === product.id);
            
            if (existingItem) {
              existingItem.quantity += quantity;
            } else {
              cart.push({ ...product, quantity });
            }
            
            await storage.setItem(StorageKeys.CART, cart);
            navigation.navigate('Checkout');
          },
        },
      ]
    );
  };

  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  const decreaseQuantity = () => {
    const minQty = product.moq || 100; // Default MOQ for B2B
    if (quantity > minQty) {
      setQuantity(quantity - 1);
    } else {
      Alert.alert('Minimum Order Quantity', `Minimum order quantity is ${minQty} ${product.unit || 'units'}. Please order in bulk.`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleFavorite}>
          <Icon
            name={isFavorite ? 'favorite' : 'favorite-border'}
            size={24}
            color={isFavorite ? colors.error : colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />

        <View style={styles.content}>
          <View style={styles.badgeContainer}>
            {product.moq && (
              <View style={styles.moqBadge}>
                <Icon name="inventory" size={16} color={colors.white} />
                <Text style={styles.moqBadgeText}>MOQ: {product.moq} {product.unit || 'units'}</Text>
              </View>
            )}
            {product.stockQuantity > 0 && (
              <View style={styles.stockBadge}>
                <Icon name="check-circle" size={16} color={colors.white} />
                <Text style={styles.stockBadgeText}>In Stock</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.description}>{product.description}</Text>

          {product.supplier && (
            <View style={styles.supplierInfo}>
              <Text style={styles.infoLabel}>Supplier</Text>
              <Text style={styles.infoValue}>{product.supplier}</Text>
              {product.supplierCode && (
                <Text style={styles.supplierCode}>Code: {product.supplierCode}</Text>
              )}
            </View>
          )}

          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Manufacturer</Text>
              <Text style={styles.infoValue}>{product.manufacturer}</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>Expiry Date</Text>
              <Text style={styles.infoValue}>{product.expiryDate}</Text>
            </View>
          </View>

          {(product.hsnCode || product.gstRate) && (
            <View style={styles.infoRow}>
              {product.hsnCode && (
                <View>
                  <Text style={styles.infoLabel}>HSN Code</Text>
                  <Text style={styles.infoValue}>{product.hsnCode}</Text>
                </View>
              )}
              {product.gstRate && (
                <View>
                  <Text style={styles.infoLabel}>GST Rate</Text>
                  <Text style={styles.infoValue}>{product.gstRate}%</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.priceContainer}>
            <View>
              <Text style={styles.priceLabel}>Purchase Price</Text>
              <Text style={styles.price}>₹{product.price}/{product.unit || 'unit'}</Text>
            </View>
            {product.retailPrice && (
              <View style={styles.retailPriceContainer}>
                <Text style={styles.retailPriceLabel}>Retail Price</Text>
                <Text style={styles.retailPrice}>₹{product.retailPrice}</Text>
              </View>
            )}
          </View>
          {product.volumeDiscounts && product.volumeDiscounts.length > 0 && (
            <View style={styles.discountInfo}>
              <Text style={styles.discountTitle}>Volume Discounts:</Text>
              {product.volumeDiscounts.map((discount, index) => (
                <Text key={index} style={styles.discountItem}>
                  Order {discount.minQty}+ units: {discount.discount}% discount
                </Text>
              ))}
            </View>
          )}

          <View style={styles.quantityContainer}>
            <View>
              <Text style={styles.quantityLabel}>Order Quantity:</Text>
              {product.moq && (
                <Text style={styles.moqNote}>
                  Minimum: {product.moq} {product.unit || 'units'}
                </Text>
              )}
            </View>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decreaseQuantity}
              >
                <Icon name="remove" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={increaseQuantity}
              >
                <Icon name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            <Text style={styles.detailsText}>
              This product is certified and safe for use. Please read the instructions
              carefully before use. Store in a cool and dry place away from direct sunlight.
              Keep out of reach of children.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
        >
          <Icon name="shopping-cart" size={20} color={colors.white} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buyNowButton}
          onPress={handleBuyNow}
        >
          <Text style={styles.buyNowText}>Order Now</Text>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 350,
    backgroundColor: colors.lightGray,
  },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  moqBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stockBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  supplierInfo: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  supplierCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  priceContainer: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  retailPriceContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  retailPriceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  retailPrice: {
    fontSize: 18,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  discountInfo: {
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  discountTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  discountItem: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  moqNote: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  detailsSection: {
    marginBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  addToCartText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buyNowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buyNowText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;

