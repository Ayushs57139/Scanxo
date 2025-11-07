import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { productsAPI, categoriesAPI } from '../../services/api';
import ProductCard from '../../components/ProductCard';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../utils/storage';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadRecentSearches();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Set loading to false after max 2 seconds to show screen immediately
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 2000);
      
      try {
      const [productsData, categoriesData] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);
        clearTimeout(loadingTimeout);
      setProducts(productsData);
      setCategories(categoriesData);
        setLoading(false);
      } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error loading data:', error);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = products.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
      setShowSuggestions(false);
    } else {
      setResults([]);
      setShowSuggestions(true);
    }
  }, [searchQuery, products]);

  const loadRecentSearches = async () => {
    const searches = await storage.getItem('recentSearches') || [];
    setRecentSearches(searches);
  };

  const saveRecentSearch = async (query) => {
    if (!query.trim()) return;
    const searches = await storage.getItem('recentSearches') || [];
    const updated = [query, ...searches.filter(s => s !== query)].slice(0, 5);
    await storage.setItem('recentSearches', updated);
    setRecentSearches(updated);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    saveRecentSearch(query);
    setShowSuggestions(false);
  };

  const handleClearRecent = async () => {
    await storage.setItem('recentSearches', []);
    setRecentSearches([]);
  };

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

  const renderSuggestion = (item) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSearch(item)}
    >
      <Icon name="history" size={20} color={colors.textSecondary} />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={24} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines to order..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {showSuggestions && searchQuery.length === 0 ? (
        <ScrollView style={styles.content}>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={handleClearRecent}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((item, index) => (
                <React.Fragment key={index}>
                  {renderSuggestion(item)}
                </React.Fragment>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <View style={styles.categoriesContainer}>
              {categories.slice(0, 6).map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryChip}
                  onPress={() => handleSearch(category.name)}
                >
                  <Text style={styles.categoryChipText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
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
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search-off" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try searching with different keywords</Text>
        </View>
      ) : null}
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  cancelText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  clearText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryChip: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  listContent: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
});

export default SearchScreen;

