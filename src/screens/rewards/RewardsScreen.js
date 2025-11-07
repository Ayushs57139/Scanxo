import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { StorageKeys, storage } from '../../utils/storage';
import { rewardsAPI } from '../../services/api';

const RewardsScreen = ({ navigation }) => {
  const [rewards, setRewards] = useState(null);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'earned', 'redeemed'

  useEffect(() => {
    loadUserAndRewards();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserAndRewards();
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation]);

  useEffect(() => {
    filterHistory();
  }, [activeFilter, history]);

  const loadUserAndRewards = async () => {
    try {
      setLoading(true);
      
      // Load user data first (fast)
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        setUserId(user.id || user.phone || 'default');
      }
      
      // Set loading to false after max 2 seconds to show screen immediately
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 2000);
      
      // Load rewards and history in background
      try {
        const currentUserId = userData ? (userData.id || userData.phone || 'default') : (userId || 'default');
        
        if (currentUserId && currentUserId !== 'default') {
          const [rewardsData, historyData] = await Promise.all([
            rewardsAPI.getRewards(currentUserId),
            rewardsAPI.getHistory(currentUserId)
          ]);
          
          clearTimeout(loadingTimeout);
          setRewards(rewardsData);
          setHistory(historyData || []);
          setLoading(false);
        } else {
          clearTimeout(loadingTimeout);
          setRewards({ points: 0, totalEarned: 0, totalRedeemed: 0, tier: 'Bronze', status: 'active' });
          setHistory([]);
          setLoading(false);
        }
      } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error loading rewards:', error);
        setRewards({ points: 0, totalEarned: 0, totalRedeemed: 0, tier: 'Bronze', status: 'active' });
        setHistory([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
      setLoading(false);
      setRewards({ points: 0, totalEarned: 0, totalRedeemed: 0, tier: 'Bronze', status: 'active' });
      setHistory([]);
    }
  };

  const filterHistory = () => {
    if (activeFilter === 'all') {
      setFilteredHistory(history);
    } else {
      setFilteredHistory(history.filter(item => item.type === activeFilter));
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Gold':
        return '#FFD700';
      case 'Silver':
        return '#C0C0C0';
      case 'Bronze':
        return '#CD7F32';
      default:
        return '#CD7F32';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRedeem = () => {
    Alert.alert(
      'Redeem Points',
      'Enter the number of points you want to redeem:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Redeem',
          onPress: async () => {
            // For now, show a placeholder
            Alert.alert('Info', 'Redeem functionality will be available soon');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const currentRewards = rewards || { points: 0, totalEarned: 0, totalRedeemed: 0, tier: 'Bronze', status: 'active' };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Rewards</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
        {/* Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View>
              <Text style={styles.pointsLabel}>Available Points</Text>
              <Text style={styles.pointsValue}>{currentRewards.points || 0}</Text>
            </View>
            <View style={[styles.tierBadge, { backgroundColor: getTierColor(currentRewards.tier) }]}>
              <Icon name="star" size={24} color={colors.white} />
              <Text style={styles.tierText}>{currentRewards.tier}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Earned</Text>
              <Text style={styles.statValue}>{currentRewards.totalEarned || 0}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Redeemed</Text>
              <Text style={styles.statValue}>{currentRewards.totalRedeemed || 0}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.redeemButton} onPress={handleRedeem}>
            <Icon name="card-giftcard" size={20} color={colors.white} />
            <Text style={styles.redeemButtonText}>Redeem Points</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'earned' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('earned')}
          >
            <Icon name="trending-up" size={16} color={activeFilter === 'earned' ? colors.white : colors.primary} />
            <Text style={[styles.filterText, activeFilter === 'earned' && styles.filterTextActive]}>
              Earned
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'redeemed' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('redeemed')}
          >
            <Icon name="trending-down" size={16} color={activeFilter === 'redeemed' ? colors.white : colors.primary} />
            <Text style={[styles.filterText, activeFilter === 'redeemed' && styles.filterTextActive]}>
              Redeemed
            </Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Reward History</Text>
          
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="history" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No reward history yet</Text>
              <Text style={styles.emptySubtext}>Start earning points by placing orders!</Text>
            </View>
          ) : (
            <FlatList
              data={filteredHistory}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <View style={styles.historyItem}>
                  <View style={[
                    styles.historyIcon,
                    { backgroundColor: item.type === 'earned' ? '#4CAF50' : '#F44336' }
                  ]}>
                    <Icon
                      name={item.type === 'earned' ? 'add' : 'remove'}
                      size={20}
                      color={colors.white}
                    />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyDescription}>
                      {item.description || (item.type === 'earned' ? 'Points earned' : 'Points redeemed')}
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
                    {item.orderId && (
                      <Text style={styles.historyOrderId}>Order #{item.orderId}</Text>
                    )}
                  </View>
                  <View style={styles.historyPoints}>
                    <Text style={[
                      styles.historyPointsText,
                      { color: item.type === 'earned' ? '#4CAF50' : '#F44336' }
                    ]}>
                      {item.type === 'earned' ? '+' : '-'}{item.points}
                    </Text>
                  </View>
                </View>
              )}
              scrollEnabled={false}
            />
          )}
        </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  pointsCard: {
    backgroundColor: colors.primary,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pointsLabel: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 4,
  },
  filterTextActive: {
    color: colors.white,
  },
  historySection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  historyOrderId: {
    fontSize: 12,
    color: colors.primary,
  },
  historyPoints: {
    alignItems: 'flex-end',
  },
  historyPointsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RewardsScreen;

