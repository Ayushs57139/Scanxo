import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { productsAPI, categoriesAPI, bannersAPI } from '../../services/api';
import CategoryCard from '../../components/CategoryCard';
import ProductCard from '../../components/ProductCard';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../utils/storage';
import { products as dummyProducts, categories as dummyCategories, banners as dummyBanners } from '../../constants/data';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [cartCount, setCartCount] = useState(0);
  const [products, setProducts] = useState(dummyProducts);
  const [categories, setCategories] = useState(dummyCategories);
  const [banners, setBanners] = useState(dummyBanners);
  const [trendingProducts, setTrendingProducts] = useState(() => {
    // Initialize with dummy products that have discounts
    return dummyProducts
      .filter(p => (p.discount && parseFloat(p.discount) > 0))
      .sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0))
      .slice(0, 3);
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerScrollRef = useRef(null);
  const [exploreBannerIndex, setExploreBannerIndex] = useState(0);
  const exploreBannerScrollRef = useRef(null);

  useEffect(() => {
    loadData();
    loadCartCount();
    const unsubscribe = navigation.addListener('focus', () => {
      loadCartCount();
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  // Auto-scroll explore banners
  useEffect(() => {
    const bannerWidth = width;
    const totalBanners = 4;
    let intervalId = null;

    if (totalBanners > 1) {
      // Start auto-scroll after a short delay to ensure component is rendered
      const startTimeout = setTimeout(() => {
        intervalId = setInterval(() => {
          setExploreBannerIndex((prevIndex) => {
            const nextIndex = (prevIndex + 1) % totalBanners;
            if (exploreBannerScrollRef.current) {
              exploreBannerScrollRef.current.scrollToOffset({
                offset: nextIndex * bannerWidth,
                animated: true,
              });
            }
            return nextIndex;
          });
        }, 3000); // Change banner every 3 seconds
      }, 1000); // Wait 1 second before starting

      return () => {
        clearTimeout(startTimeout);
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
  }, [width]);

  const loadData = async () => {
    setLoading(true);
    
    // Set loading to false after max 2 seconds to show screen immediately
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve('timeout'), 5000);
    });
    
    try {
      const results = await Promise.race([
        Promise.allSettled([
          productsAPI.getAll(),
          categoriesAPI.getAll(),
          bannersAPI.getAll(),
        ]),
        timeoutPromise,
      ]);
      
      if (results === 'timeout') {
        clearTimeout(loadingTimeout);
        // Use dummy data as fallback
        console.log('HomeScreen: API timeout, using dummy data');
        setProducts(dummyProducts);
        setCategories(dummyCategories);
        setBanners(dummyBanners);
        // Set trending products from dummy data
        const trending = dummyProducts
          .filter(p => (p.discount && parseFloat(p.discount) > 0))
          .sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0))
          .slice(0, 3);
        setTrendingProducts(trending);
        setLoading(false);
        return;
      }
      
      if (results[0].status === 'fulfilled') {
        const productsData = results[0].value;
        console.log('HomeScreen: Products loaded:', productsData?.length || 0, 'products');
        setProducts(Array.isArray(productsData) && productsData.length > 0 ? productsData : dummyProducts);
      } else {
        // Log all errors for debugging
        const errorMsg = results[0].reason?.message || results[0].reason?.toString() || '';
        console.error('HomeScreen: Error fetching products:', errorMsg);
        console.error('HomeScreen: Error details:', results[0].reason);
        // Use dummy data as fallback
        setProducts(dummyProducts);
      }
      
      if (results[1].status === 'fulfilled') {
        const categoriesData = results[1].value;
        setCategories(Array.isArray(categoriesData) && categoriesData.length > 0 ? categoriesData : dummyCategories);
      } else {
        // Only log if it's not a network error
        const errorMsg = results[1].reason?.message || results[1].reason?.toString() || '';
        if (!errorMsg.includes('Network request failed') && !errorMsg.includes('Failed to fetch')) {
          console.error('Error fetching categories:', results[1].reason);
        }
        // Use dummy data as fallback
        setCategories(dummyCategories);
      }
      
      if (results[2].status === 'fulfilled') {
        const bannersData = results[2].value;
        setBanners(Array.isArray(bannersData) && bannersData.length > 0 ? bannersData : dummyBanners);
      } else {
        // Only log if it's not a network error
        const errorMsg = results[2].reason?.message || results[2].reason?.toString() || '';
        if (!errorMsg.includes('Network request failed') && !errorMsg.includes('Failed to fetch')) {
          console.error('Error fetching banners:', results[2].reason);
        }
        // Use dummy data as fallback
        setBanners(dummyBanners);
      }
      
      // Set trending products
      try {
        const trendingRes = await productsAPI.getTrending();
        console.log('HomeScreen: Trending products loaded:', trendingRes?.length || 0, 'products');
        if (Array.isArray(trendingRes) && trendingRes.length > 0) {
          setTrendingProducts(trendingRes.slice(0, 3));
        } else {
          // Fallback to dummy products with discount
          const allProducts = results[0].status === 'fulfilled' && results[0].value?.length > 0 
            ? results[0].value 
            : dummyProducts;
          const trending = allProducts
            .filter(p => (p.discount && parseFloat(p.discount) > 0) || p.isTrending === true)
            .sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0))
            .slice(0, 3);
          console.log('HomeScreen: Using fallback trending products:', trending.length);
          setTrendingProducts(trending);
        }
      } catch (error) {
        console.error('HomeScreen: Error fetching trending products:', error);
        // Fallback: use products with discount from API or dummy data
        const allProducts = results[0].status === 'fulfilled' && results[0].value?.length > 0
          ? results[0].value
          : dummyProducts;
        if (Array.isArray(allProducts)) {
          const trending = allProducts
            .filter(p => (p.discount && parseFloat(p.discount) > 0) || p.isTrending === true)
            .sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0))
            .slice(0, 3);
          console.log('HomeScreen: Using fallback trending products:', trending.length);
          setTrendingProducts(trending);
        } else {
          // Final fallback to dummy products
          const trending = dummyProducts
            .filter(p => (p.discount && parseFloat(p.discount) > 0))
            .sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0))
            .slice(0, 3);
          setTrendingProducts(trending);
        }
      }
      
      clearTimeout(loadingTimeout);
      setLoading(false);
    } catch (error) {
      clearTimeout(loadingTimeout);
      console.error('Error loading data:', error);
      // Use dummy data as fallback
      setProducts(dummyProducts);
      setCategories(dummyCategories);
      setBanners(dummyBanners);
      // Set trending products from dummy data
      const trending = dummyProducts
        .filter(p => (p.discount && parseFloat(p.discount) > 0))
        .sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0))
        .slice(0, 3);
      setTrendingProducts(trending);
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    const cart = await storage.getItem(StorageKeys.CART) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(totalItems);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadCartCount();
    setRefreshing(false);
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
            loadCartCount();
            Alert.alert('Success', 'Product added to cart!');
          },
        },
      ]
    );
  };

  const renderBanner = ({ item, index }) => (
    <View style={[styles.banner, { backgroundColor: item.color || '#1E3A8A' }]}>
      <View style={styles.bannerContent}>
        {item.title && <Text style={styles.bannerTitle}>{item.title}</Text>}
        {item.subtitle && <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>}
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        )}
      </View>
    </View>
  );

  const renderTrendingProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.trendingProductCard}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <View style={styles.trendingProductIcon}>
        <Icon name="medication" size={24} color={colors.textSecondary} />
      </View>
      <View style={styles.trendingProductInfo}>
        <Text style={styles.trendingProductName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.trendingProductPrice}>
          <Text style={styles.ptrText}>PTR: ₹{item.price || item.pricePerPack || '0.00'}</Text>
          {item.retailPrice && (
            <Text style={styles.mrpText}>MRP: ₹{item.retailPrice}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddToCart(item)}
      >
        <Icon name="add" size={20} color={colors.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.profileIcon}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="person" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appName}>Scanxo</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon name="notifications" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Favorites')}
          >
            <Icon name="favorite" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
          >
            <Icon name="search" size={20} color={colors.textSecondary} />
            <Text style={styles.searchText}>Search for medicines</Text>
          </TouchableOpacity>
          <View style={styles.searchDivider} />
          <TouchableOpacity style={styles.distributorButton}>
            <Text style={styles.distributorText}>Distributor</Text>
            <Icon name="arrow-drop-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Explore Banners Carousel */}
        <View style={styles.exploreBannerContainer}>
          <FlatList
            ref={exploreBannerScrollRef}
            data={[
              { 
                id: 1, 
                image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=400&fit=crop',
                title: 'Premium Medicines',
                subtitle: 'Quality Healthcare Products',
                backgroundColor: '#2196F3'
              },
              { 
                id: 2, 
                image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&h=400&fit=crop',
                title: 'Best Prices',
                subtitle: 'Wholesale Rates Available',
                backgroundColor: '#FF9800'
              },
              { 
                id: 3, 
                image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop',
                title: 'Fast Delivery',
                subtitle: 'Quick & Reliable Service',
                backgroundColor: '#4CAF50'
              },
              { 
                id: 4, 
                image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=400&fit=crop',
                title: 'Trusted Pharmacy',
                subtitle: 'Licensed & Certified',
                backgroundColor: '#9C27B0'
              },
            ]}
            renderItem={({ item }) => (
              <View style={[styles.exploreBanner, { backgroundColor: item.backgroundColor }]}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.exploreBannerImage}
                  resizeMode="cover"
                  onError={() => {
                    // Image failed to load, background color will show
                  }}
                />
                <View style={styles.exploreBannerOverlay}>
                  <View style={styles.exploreBannerIcon}>
                    <Icon name="medication" size={32} color={colors.white} />
                  </View>
                  <Text style={styles.exploreBannerTitle}>{item.title}</Text>
                  <Text style={styles.exploreBannerSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setExploreBannerIndex(index);
            }}
            style={styles.exploreBannerList}
            onScrollToIndexFailed={(info) => {
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
                exploreBannerScrollRef.current?.scrollToIndex({ index: info.index, animated: true });
              });
            }}
          />
          <View style={styles.exploreBannerDots}>
            {[1, 2, 3, 4].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.exploreDot,
                  index === exploreBannerIndex && styles.exploreActiveDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Explore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.exploreGrid}>
            <TouchableOpacity 
              style={styles.exploreItem}
              onPress={() => navigation.navigate('Distributors')}
            >
              <View style={[styles.exploreIcon, { backgroundColor: '#2196F3' }]}>
                <Icon name="store" size={24} color={colors.white} />
              </View>
              <Text style={styles.exploreLabel}>Distributors</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.exploreItem}
              onPress={() => navigation.navigate('Rewards')}
            >
              <View style={[styles.exploreIcon, { backgroundColor: '#FFC107' }]}>
                <Icon name="stars" size={24} color={colors.white} />
              </View>
              <Text style={styles.exploreLabel}>Rewards</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.exploreItem}
              onPress={() => navigation.navigate('Outstanding')}
            >
              <View style={[styles.exploreIcon, { backgroundColor: '#F44336' }]}>
                <Icon name="bar-chart" size={24} color={colors.white} />
              </View>
              <Text style={styles.exploreLabel}>Outstanding</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.exploreItem}
              onPress={() => navigation.navigate('CompanySchema')}
            >
              <View style={[styles.exploreIcon, { backgroundColor: '#4CAF50' }]}>
                <Icon name="percent" size={24} color={colors.white} />
              </View>
              <Text style={styles.exploreLabel}>Company Sch...</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Cards */}
        <View style={styles.featureCardsContainer}>
          <TouchableOpacity style={[styles.featureCard, styles.favoritesCard]}>
            <Icon name="favorite-border" size={32} color="#FF6B35" />
            <Text style={styles.featureCardTitle}>Favorites</Text>
            <Text style={styles.featureCardSubtitle}>Make favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.featureCard, styles.genericCard]}>
            <Icon name="medication" size={32} color="#4CAF50" />
            <Text style={styles.featureCardTitle}>Generic</Text>
            <Text style={styles.featureCardSubtitle}>Generic products</Text>
          </TouchableOpacity>
        </View>

        {/* Trending Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Products</Text>
          <FlatList
            data={trendingProducts}
            renderItem={renderTrendingProduct}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyTrending}>
                <Text style={styles.emptyText}>No trending products available</Text>
              </View>
            }
          />
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <FlatList
            data={products.slice(0, 6)}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                onAddToCart={handleAddToCart}
              />
            )}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.featuredContent}
          />
        </View>

        {/* Special Offers Section */}
        {banners.length > 0 && (
          <View style={styles.section}>
            <View style={styles.specialOffersHeader}>
              <Text style={styles.specialOffersTitle}>Special Offers</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {banners.slice(0, 2).map((banner, index) => (
                <TouchableOpacity key={index} style={styles.specialOfferCard}>
                  {banner.image && (
                    <Image
                      source={{ uri: banner.image }}
                      style={styles.specialOfferImage}
                      resizeMode="cover"
                    />
                  )}
                  {banner.title && (
                    <Text style={styles.specialOfferTitle}>{banner.title}</Text>
                  )}
                  {banner.subtitle && (
                    <Text style={styles.specialOfferSubtitle}>{banner.subtitle}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    paddingTop: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  searchText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  distributorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  distributorText: {
    fontSize: 14,
    color: colors.text,
    marginRight: 4,
  },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1BEE7',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  welcomeBannerIcon: {
    marginRight: 8,
  },
  welcomeBannerText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  carouselContainer: {
    marginBottom: 20,
  },
  bannerList: {
    marginBottom: 12,
  },
  banner: {
    width: width - 32,
    height: 200,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E3A8A',
  },
  bannerContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 12,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  exploreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  exploreItem: {
    alignItems: 'center',
    width: '23%',
    marginBottom: 12,
  },
  exploreIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  exploreLabel: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  featureCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  featureCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  favoritesCard: {
    backgroundColor: '#FFF3E0',
  },
  genericCard: {
    backgroundColor: '#E8F5E9',
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  featureCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  trendingProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  trendingProductIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trendingProductInfo: {
    flex: 1,
  },
  trendingProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  trendingProductPrice: {
    flexDirection: 'row',
    gap: 12,
  },
  ptrText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  mrpText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTrending: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  specialOffersHeader: {
    backgroundColor: '#1E3A8A',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  specialOffersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  specialOfferCard: {
    width: width - 64,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  specialOfferImage: {
    width: '100%',
    height: 150,
  },
  specialOfferTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    padding: 12,
  },
  specialOfferSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  exploreBannerContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  exploreBannerList: {
    marginBottom: 12,
  },
  exploreBanner: {
    width: width - 32,
    height: 160,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: 'relative',
  },
  exploreBannerImage: {
    width: '100%',
    height: '100%',
  },
  exploreBannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  exploreBannerIcon: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  exploreBannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  exploreBannerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.95,
  },
  exploreBannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  exploreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 4,
  },
  exploreActiveDot: {
    backgroundColor: colors.primary,
    width: 12,
  },
  featuredContent: {
    padding: 8,
  },
});

export default HomeScreen;

