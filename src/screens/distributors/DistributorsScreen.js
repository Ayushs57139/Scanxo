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
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { StorageKeys, storage } from '../../utils/storage';
import { distributorsAPI } from '../../services/api';

const DistributorsScreen = ({ navigation }) => {
  console.log('DistributorsScreen rendered');
  const [activeTab, setActiveTab] = useState('Mapped');
  const [searchQuery, setSearchQuery] = useState('');
  const [distributors, setDistributors] = useState([]);
  const [filteredDistributors, setFilteredDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [showReferModal, setShowReferModal] = useState(false);
  const [referName, setReferName] = useState('');

  useEffect(() => {
    loadUserAndDistributors();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserAndDistributors();
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation]);

  useEffect(() => {
    filterDistributors();
  }, [activeTab, searchQuery, distributors]);

  const loadUserAndDistributors = async () => {
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
      
      // Load distributors in background
      try {
        const data = await distributorsAPI.getAll();
        clearTimeout(loadingTimeout);
        setDistributors(data || []);
        setLoading(false);
      } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error fetching distributors:', error);
        setDistributors([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading distributors:', error);
      setLoading(false);
      setDistributors([]);
    }
  };

  const filterDistributors = () => {
    let filtered = distributors;

    // Filter by tab
    if (activeTab === 'Mapped') {
      filtered = filtered.filter(d => d.isMapped === true);
    } else if (activeTab === 'Non-Mapped') {
      filtered = filtered.filter(d => d.isMapped === false || !d.isMapped);
    } else if (activeTab === 'Refer') {
      // For refer tab, show all distributors
      filtered = filtered;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(d =>
        d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by priority
    filtered = filtered.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    setFilteredDistributors(filtered);
  };

  const handleReset = () => {
    setSearchQuery('');
    setActiveTab('Mapped');
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    
    const newList = [...filteredDistributors];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    
    // Update priorities
    const updatedList = newList.map((item, idx) => ({
      ...item,
      priority: idx + 1,
    }));
    
    setFilteredDistributors(updatedList);
    
    // Update in backend
    try {
      await distributorsAPI.update(newList[index].id, { priority: index });
      await distributorsAPI.update(newList[index - 1].id, { priority: index + 1 });
      await loadDistributors();
    } catch (error) {
      console.error('Error updating priorities:', error);
      Alert.alert('Error', 'Failed to update distributor priorities');
    }
  };

  const handleMoveDown = async (index) => {
    if (index === filteredDistributors.length - 1) return;
    
    const newList = [...filteredDistributors];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    
    // Update priorities
    const updatedList = newList.map((item, idx) => ({
      ...item,
      priority: idx + 1,
    }));
    
    setFilteredDistributors(updatedList);
    
    // Update in backend
    try {
      await distributorsAPI.update(newList[index].id, { priority: index + 2 });
      await distributorsAPI.update(newList[index + 1].id, { priority: index + 1 });
      await loadDistributors();
    } catch (error) {
      console.error('Error updating priorities:', error);
      Alert.alert('Error', 'Failed to update distributor priorities');
    }
  };

  const handleReferDistributor = () => {
    setShowReferModal(true);
  };

  const handleSubmitReferral = async () => {
    if (!referName.trim()) {
      Alert.alert('Error', 'Please enter distributor name');
      return;
    }

    try {
      await distributorsAPI.create({
        name: referName.trim(),
        isMapped: false,
        priority: 0,
        status: 'pending',
      });
      Alert.alert('Success', 'Distributor referral submitted successfully');
      setReferName('');
      setShowReferModal(false);
      await loadDistributors();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit referral');
    }
  };

  const renderDistributorItem = ({ item, index }) => {
    const address = item.address || `${item.city || ''}, ${item.state || ''}`.trim() || 'Address not available';
    const displayAddress = address.length > 50 ? address.substring(0, 50) + '...' : address;

    return (
      <View style={styles.distributorCard}>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>{item.priority || index + 1}</Text>
        </View>

        <View style={styles.distributorInfo}>
          <Text style={styles.distributorName} numberOfLines={1}>
            {item.name} {item.code ? `(${item.code})` : ''}
          </Text>
          <View style={styles.addressRow}>
            <Icon name="location-on" size={14} color={colors.textSecondary} />
            <Text style={styles.distributorAddress} numberOfLines={1}>
              {displayAddress}
            </Text>
          </View>
        </View>

        <View style={styles.dragControls}>
          <TouchableOpacity
            onPress={() => handleMoveUp(index)}
            disabled={index === 0}
            style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
          >
            <Icon name="keyboard-arrow-up" size={20} color={index === 0 ? colors.textSecondary : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleMoveDown(index)}
            disabled={index === filteredDistributors.length - 1}
            style={[styles.moveButton, styles.moveButtonDown, index === filteredDistributors.length - 1 && styles.moveButtonDisabled]}
          >
            <Icon name="keyboard-arrow-down" size={20} color={index === filteredDistributors.length - 1 ? colors.textSecondary : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Distributors</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetButton}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Mapped' && styles.activeTab]}
          onPress={() => setActiveTab('Mapped')}
        >
          <Text style={[styles.tabText, activeTab === 'Mapped' && styles.activeTabText]}>
            Mapped
          </Text>
          {activeTab === 'Mapped' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Non-Mapped' && styles.activeTab]}
          onPress={() => setActiveTab('Non-Mapped')}
        >
          <Text style={[styles.tabText, activeTab === 'Non-Mapped' && styles.activeTabText]}>
            Non-Mapped
          </Text>
          {activeTab === 'Non-Mapped' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Refer' && styles.activeTab]}
          onPress={() => setActiveTab('Refer')}
        >
          <Text style={[styles.tabText, activeTab === 'Refer' && styles.activeTabText]}>
            Refer
          </Text>
          {activeTab === 'Refer' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by distributor name"
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

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Select and drag up & down to set distributor priority
        </Text>
        <View style={{ marginLeft: 8 }}>
          <Icon name="pan-tool" size={16} color={colors.textSecondary} />
        </View>
      </View>

      {/* Distributors List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'Refer' ? (
        <View style={styles.referContainer}>
          <TouchableOpacity style={styles.referButton} onPress={handleReferDistributor}>
            <Icon name="person-add" size={24} color={colors.white} />
            <Text style={[styles.referButtonText, { marginLeft: 12 }]}>Refer New Distributor</Text>
          </TouchableOpacity>
          <Text style={styles.referDescription}>
            Submit a referral for a new distributor. They will be added to the system after approval.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDistributors}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderDistributorItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="store" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No distributors found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'Mapped' 
                  ? 'No mapped distributors available'
                  : 'No non-mapped distributors available'}
              </Text>
            </View>
          }
        />
      )}

      {/* Refer Modal */}
      <Modal
        visible={showReferModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Refer New Distributor</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter distributor name"
              placeholderTextColor={colors.textSecondary}
              value={referName}
              onChangeText={setReferName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowReferModal(false);
                  setReferName('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit, { marginLeft: 12 }]}
                onPress={handleSubmitReferral}
              >
                <Text style={styles.modalButtonTextSubmit}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  resetButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  distributorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dragControls: {
    flexDirection: 'column',
  },
  moveButton: {
    padding: 4,
  },
  moveButtonDown: {
    marginTop: 4,
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  priorityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  priorityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  distributorInfo: {
    flex: 1,
  },
  distributorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distributorAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  dragHandle: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  referContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  referButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  referButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  referDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: colors.lightGray,
  },
  modalButtonSubmit: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.text,
    fontWeight: '600',
  },
  modalButtonTextSubmit: {
    color: colors.white,
    fontWeight: '600',
  },
});

export default DistributorsScreen;

