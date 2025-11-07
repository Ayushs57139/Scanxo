import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { productsAPI } from '../../services/api';
import ProductCard from '../../components/ProductCard';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../utils/storage';
import { products as dummyProducts } from '../../constants/data';

const ProductListScreen = ({ navigation, route }) => {
  const [products, setProducts] = useState(dummyProducts);
  const [filteredProducts, setFilteredProducts] = useState(dummyProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(route.params?.category || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
    const unsubscribe = navigation.addListener('focus', () => {
      loadProducts();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Set loading to false after max 2 seconds to show screen immediately
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 2000);
      
      try {
        const data = await productsAPI.getAll();
        clearTimeout(loadingTimeout);
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          filterProducts(data);
        } else {
          // Use dummy data if API returns empty array
          setProducts(dummyProducts);
          filterProducts(dummyProducts);
        }
        setLoading(false);
      } catch (error) {
        clearTimeout(loadingTimeout);
        // Use dummy data as fallback on error
        setProducts(dummyProducts);
        filterProducts(dummyProducts);
        setLoading(false);
      }
    } catch (error) {
      // Use dummy data as fallback on error
      setProducts(dummyProducts);
      filterProducts(dummyProducts);
      setLoading(false);
    }
  };

  const filterProducts = (productsList) => {
    let filtered = productsList;
    
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  };

  useEffect(() => {
    filterProducts(products);
  }, [selectedCategory, searchQuery]);

  const handleAddToCart = async (product) => {
    const moq = product.moq || 100; // Default MOQ for B2B
    Alert.alert(
      'Add to Cart',
      `Add ${moq} ${product.unit || 'units'} (MOQ) of "${product.name}" to cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            const cart = await storage.getItem(StorageKeys.CART) || [];
            const existingItem = cart.find(item => item.id === product.id);
            
            if (existingItem) {
              existingItem.quantity += moq;
            } else {
              cart.push({ ...product, quantity: moq });
            }
            
            await storage.setItem(StorageKeys.CART, cart);
            Alert.alert('Success', 'Product added to cart!');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedCategory || 'All Products'}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Icon name="search" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines to order..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="inventory-2" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
              onAddToCart={handleAddToCart}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  listContent: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});

export default ProductListScreen;

