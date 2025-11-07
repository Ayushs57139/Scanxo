import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { StorageKeys, storage } from '../../utils/storage';
import { favoritesAPI } from '../../services/api';
import ProductCard from '../../components/ProductCard';

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserAndFavorites();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserAndFavorites();
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation]);

  const loadUserAndFavorites = async () => {
    try {
      setLoading(true);
      
      // Set loading to false after max 2 seconds to show screen immediately
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 2000);
      
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        const currentUserId = user.id || user.phone || 'default';
        setUserId(currentUserId);
        
        if (currentUserId && currentUserId !== 'default') {
          try {
            const data = await favoritesAPI.getByUserId(currentUserId);
            clearTimeout(loadingTimeout);
            setFavorites(data || []);
            setLoading(false);
          } catch (error) {
            clearTimeout(loadingTimeout);
            console.error('Error loading favorites:', error);
            setFavorites([]);
            setLoading(false);
          }
        } else {
          clearTimeout(loadingTimeout);
          setFavorites([]);
          setLoading(false);
        }
      } else {
        clearTimeout(loadingTimeout);
        setFavorites([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavorites([]);
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId) => {
    if (!userId || userId === 'default') {
      Alert.alert('Error', 'Please login to manage favorites');
      return;
    }

    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this item from favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await favoritesAPI.remove(userId, productId);
              await loadUserAndFavorites();
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert('Error', 'Failed to remove favorite');
            }
          },
        },
      ]
    );
  };

  const handleAddToCart = (product) => {
    // Navigate to product detail or add to cart
    navigation.navigate('ProductDetail', { product });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorite Items</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="favorite-border" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No favorite items yet</Text>
          <Text style={styles.emptySubtext}>
            Add products to your favorites to see them here
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('BrowseTab')}
          >
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.productId?.toString() || item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => {
            const product = {
              id: item.productId || item.id,
              name: item.name,
              price: item.price,
              image: item.image,
              ...item,
            };
            return (
              <View style={styles.productWrapper}>
                <ProductCard
                  product={product}
                  onPress={() => navigation.navigate('ProductDetail', { product })}
                  onAddToCart={() => handleAddToCart(product)}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFavorite(product.id)}
                >
                  <Icon name="favorite" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            );
          }}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    paddingTop: 50,
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
  listContent: {
    padding: 16,
  },
  productWrapper: {
    position: 'relative',
    marginBottom: 16,
    marginHorizontal: 4,
    flex: 1,
    maxWidth: '48%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  browseButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FavoritesScreen;

