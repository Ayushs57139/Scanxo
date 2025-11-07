import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../constants/colors';
import { favoritesAPI } from '../services/api';
import { storage } from '../utils/storage';
import { StorageKeys } from '../utils/storage';

const ProductCard = ({ product, onPress, onAddToCart }) => {
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.image }}
          style={styles.image}
          resizeMode="cover"
        />
        {product.stockQuantity > 0 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>
              Stock: {product.stockQuantity > 1000 
                ? `${(product.stockQuantity / 1000).toFixed(1)}K` 
                : product.stockQuantity}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleToggleFavorite();
          }}
        >
          <Icon 
            name={isFavorite ? 'favorite' : 'favorite-border'} 
            size={20} 
            color={isFavorite ? colors.error : colors.white} 
          />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.description} numberOfLines={1}>
          {product.description}
        </Text>
        <View style={styles.moqContainer}>
          <Icon name="inventory" size={14} color={colors.primary} />
          <Text style={styles.moqText}>MOQ: {product.moq || 100} {product.unit || 'units'}</Text>
        </View>
        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.priceLabel}>Purchase Price</Text>
            <Text style={styles.price}>₹{product.price}/{product.unit || 'unit'}</Text>
          </View>
          {product.supplier && (
            <Text style={styles.supplierText}>From: {product.supplier}</Text>
          )}
          {product.retailPrice && (
            <Text style={styles.retailPrice}>Retail Price: ₹{product.retailPrice}</Text>
          )}
        </View>
        {product.volumeDiscounts && product.volumeDiscounts.length > 0 && (
          <Text style={styles.discountNote}>
            Volume discounts available
          </Text>
        )}
        <TouchableOpacity
          style={styles.addButton}
          onPress={(e) => {
            e.stopPropagation();
            if (onAddToCart) {
              Alert.alert(
                'Add to Cart',
                `Add "${product.name}" to cart?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Add',
                    onPress: () => onAddToCart(product),
                  },
                ]
              );
            }
          }}
        >
          <Icon name="add-shopping-cart" size={18} color={colors.white} />
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    margin: 8,
    width: '45%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  moqContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  moqText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  priceContainer: {
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  retailPrice: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  supplierText: {
    fontSize: 10,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  discountNote: {
    fontSize: 10,
    color: colors.success,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default ProductCard;

