import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { companyOffersAPI } from '../../services/api';

const CompanySchemaScreen = ({ navigation }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOffers();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadOffers();
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      
      // Set loading to false after max 2 seconds to show screen immediately
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 2000);
      
      // Load offers in background
      try {
        const data = await companyOffersAPI.getAll();
        clearTimeout(loadingTimeout);
        setOffers(data || []);
        setLoading(false);
      } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error loading company offers:', error);
        setOffers([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading company offers:', error);
      setOffers([]);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOffers();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOfferValid = (offer) => {
    if (!offer.isActive) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (offer.validFrom) {
      const validFrom = new Date(offer.validFrom);
      validFrom.setHours(0, 0, 0, 0);
      if (today < validFrom) return false;
    }
    
    if (offer.validTo) {
      const validTo = new Date(offer.validTo);
      validTo.setHours(0, 0, 0, 0);
      if (today > validTo) return false;
    }
    
    return true;
  };

  const renderOfferCard = ({ item }) => {
    const isValid = isOfferValid(item);
    const discountText = item.discountType === 'percentage' 
      ? `${item.discount}% OFF`
      : `₹${item.discount} OFF`;

    return (
      <TouchableOpacity 
        style={[styles.offerCard, !isValid && styles.offerCardInactive]}
        activeOpacity={0.7}
      >
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.offerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.offerImagePlaceholder}>
            <Icon name="local-offer" size={48} color={colors.primary} />
          </View>
        )}
        
        <View style={styles.offerContent}>
          <View style={styles.offerHeader}>
            <Text style={styles.offerTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.discountBadge, !isValid && styles.discountBadgeInactive]}>
              <Text style={styles.discountText}>{discountText}</Text>
            </View>
          </View>
          
          {item.description && (
            <Text style={styles.offerDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.offerDetails}>
            {item.minPurchaseAmount > 0 && (
              <View style={styles.detailRow}>
                <Icon name="shopping-cart" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  Min. Purchase: ₹{item.minPurchaseAmount}
                </Text>
              </View>
            )}
            
            {(item.validFrom || item.validTo) && (
              <View style={styles.detailRow}>
                <Icon name="calendar-today" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {item.validFrom && item.validTo 
                    ? `${formatDate(item.validFrom)} - ${formatDate(item.validTo)}`
                    : item.validFrom 
                    ? `From ${formatDate(item.validFrom)}`
                    : `Until ${formatDate(item.validTo)}`}
                </Text>
              </View>
            )}
          </View>
          
          {!isValid && (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Offers</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Offers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="local-offer" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No offers available</Text>
          <Text style={styles.emptySubtext}>
            Check back later for exciting offers and discounts
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderOfferCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
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
  offerCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  offerCardInactive: {
    opacity: 0.6,
  },
  offerImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.lightGray,
  },
  offerImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerContent: {
    padding: 16,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountBadgeInactive: {
    backgroundColor: colors.textSecondary,
  },
  discountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  offerDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  offerDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  expiredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  expiredText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
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
});

export default CompanySchemaScreen;

