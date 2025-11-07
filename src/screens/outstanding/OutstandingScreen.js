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
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { StorageKeys, storage } from '../../utils/storage';
import { outstandingAPI } from '../../services/api';

const OutstandingScreen = ({ navigation }) => {
  const [outstanding, setOutstanding] = useState([]);
  const [filteredOutstanding, setFilteredOutstanding] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'partial', 'cleared', 'overdue'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOutstanding, setSelectedOutstanding] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    loadUserAndOutstanding();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserAndOutstanding();
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation]);

  useEffect(() => {
    filterOutstanding();
  }, [activeFilter, outstanding]);

  const loadUserAndOutstanding = async () => {
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
      
      // Load outstanding and summary in background
      try {
        const currentUserId = userData ? (userData.id || userData.phone || 'default') : (userId || 'default');
        
        if (currentUserId && currentUserId !== 'default') {
          const [outstandingData, summaryData] = await Promise.all([
            outstandingAPI.getAll(currentUserId),
            outstandingAPI.getSummary(currentUserId)
          ]);
          
          clearTimeout(loadingTimeout);
          setOutstanding(outstandingData || []);
          setSummary(summaryData || {
            totalAmount: 0,
            totalPending: 0,
            totalCleared: 0,
            totalCount: 0,
            pendingCount: 0,
            overdueCount: 0,
            clearedCount: 0
          });
          setLoading(false);
        } else {
          clearTimeout(loadingTimeout);
          setOutstanding([]);
          setSummary({
            totalAmount: 0,
            totalPending: 0,
            totalCleared: 0,
            totalCount: 0,
            pendingCount: 0,
            overdueCount: 0,
            clearedCount: 0
          });
          setLoading(false);
        }
      } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error loading outstanding:', error);
        setOutstanding([]);
        setSummary({
          totalAmount: 0,
          totalPending: 0,
          totalCleared: 0,
          totalCount: 0,
          pendingCount: 0,
          overdueCount: 0,
          clearedCount: 0
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading outstanding:', error);
      setLoading(false);
      setOutstanding([]);
      setSummary({
        totalAmount: 0,
        totalPending: 0,
        totalCleared: 0,
        totalCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        clearedCount: 0
      });
    }
  };

  const filterOutstanding = () => {
    if (activeFilter === 'all') {
      setFilteredOutstanding(outstanding);
    } else {
      setFilteredOutstanding(outstanding.filter(item => item.status === activeFilter));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'cleared':
        return '#4CAF50';
      case 'partial':
        return '#FF9800';
      case 'overdue':
        return '#F44336';
      case 'pending':
        return '#2196F3';
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const handlePay = (item) => {
    setSelectedOutstanding(item);
    setPaymentAmount(item.pendingAmount?.toString() || '0');
    setPaymentMethod('cash');
    setTransactionId('');
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedOutstanding) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    
    if (amount > parseFloat(selectedOutstanding.pendingAmount)) {
      Alert.alert('Error', 'Payment amount cannot exceed pending amount');
      return;
    }
    
    try {
      const currentUserId = userId || 'default';
      await outstandingAPI.makePayment(
        currentUserId,
        selectedOutstanding.id,
        amount,
        paymentMethod,
        transactionId || null,
        'Payment received',
        new Date().toISOString().split('T')[0]
      );
      
      Alert.alert('Success', 'Payment processed successfully');
      setShowPaymentModal(false);
      setSelectedOutstanding(null);
      setPaymentAmount('');
      setTransactionId('');
      loadUserAndOutstanding();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process payment');
    }
  };

  const currentSummary = summary || {
    totalAmount: 0,
    totalPending: 0,
    totalCleared: 0,
    totalCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    clearedCount: 0
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Outstanding</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Pending</Text>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                ₹{currentSummary.totalPending?.toFixed(2) || '0.00'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Cleared</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                ₹{currentSummary.totalCleared?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>
                ₹{currentSummary.totalAmount?.toFixed(2) || '0.00'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Records</Text>
              <Text style={styles.summaryValue}>
                {currentSummary.totalCount || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              All ({currentSummary.totalCount || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'pending' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('pending')}
          >
            <Text style={[styles.filterText, activeFilter === 'pending' && styles.filterTextActive]}>
              Pending ({currentSummary.pendingCount || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'overdue' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('overdue')}
          >
            <Text style={[styles.filterText, activeFilter === 'overdue' && styles.filterTextActive]}>
              Overdue ({currentSummary.overdueCount || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'cleared' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('cleared')}
          >
            <Text style={[styles.filterText, activeFilter === 'cleared' && styles.filterTextActive]}>
              Cleared ({currentSummary.clearedCount || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Outstanding List */}
        <View style={styles.listSection}>
          {filteredOutstanding.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="receipt" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No outstanding amounts</Text>
              <Text style={styles.emptySubtext}>All your payments are up to date!</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOutstanding}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => {
                const overdue = isOverdue(item.dueDate);
                return (
                  <View style={styles.outstandingItem}>
                    <View style={styles.outstandingHeader}>
                      <View style={styles.outstandingInfo}>
                        <Text style={styles.outstandingInvoice}>
                          {item.invoiceNumber ? `Invoice: ${item.invoiceNumber}` : `#${item.id}`}
                        </Text>
                        {item.orderId && (
                          <Text style={styles.outstandingOrderId}>Order #{item.orderId}</Text>
                        )}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.amountRow}>
                      <View style={styles.amountItem}>
                        <Text style={styles.amountLabel}>Total Amount</Text>
                        <Text style={styles.amountValue}>₹{parseFloat(item.amount || 0).toFixed(2)}</Text>
                      </View>
                      <View style={styles.amountItem}>
                        <Text style={styles.amountLabel}>Pending</Text>
                        <Text style={[styles.amountValue, { color: '#F44336' }]}>
                          ₹{parseFloat(item.pendingAmount || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.amountItem}>
                        <Text style={styles.amountLabel}>Cleared</Text>
                        <Text style={[styles.amountValue, { color: '#4CAF50' }]}>
                          ₹{parseFloat(item.clearedAmount || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    
                    {item.dueDate && (
                      <View style={styles.dueDateRow}>
                        <Icon 
                          name="calendar-today" 
                          size={16} 
                          color={overdue ? '#F44336' : colors.textSecondary} 
                        />
                        <Text style={[styles.dueDateText, overdue && styles.overdueText]}>
                          Due: {formatDate(item.dueDate)}
                        </Text>
                      </View>
                    )}
                    
                    {item.status !== 'cleared' && (
                      <TouchableOpacity
                        style={styles.payButton}
                        onPress={() => handlePay(item)}
                      >
                        <Icon name="payment" size={18} color={colors.white} />
                        <Text style={styles.payButtonText}>Pay Now</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
              scrollEnabled={false}
            />
          )}
        </View>
          </>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {selectedOutstanding && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoText}>
                    Invoice: {selectedOutstanding.invoiceNumber || `#${selectedOutstanding.id}`}
                  </Text>
                  <Text style={styles.modalInfoText}>
                    Pending: ₹{parseFloat(selectedOutstanding.pendingAmount || 0).toFixed(2)}
                  </Text>
                </View>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Payment Amount"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                />
                
                <View style={styles.paymentMethodContainer}>
                  <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                  <View style={styles.paymentMethodButtons}>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodButton,
                        paymentMethod === 'cash' && styles.paymentMethodButtonActive
                      ]}
                      onPress={() => setPaymentMethod('cash')}
                    >
                      <Text style={[
                        styles.paymentMethodText,
                        paymentMethod === 'cash' && styles.paymentMethodTextActive
                      ]}>
                        Cash
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodButton,
                        paymentMethod === 'bank' && styles.paymentMethodButtonActive
                      ]}
                      onPress={() => setPaymentMethod('bank')}
                    >
                      <Text style={[
                        styles.paymentMethodText,
                        paymentMethod === 'bank' && styles.paymentMethodTextActive
                      ]}>
                        Bank
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodButton,
                        paymentMethod === 'upi' && styles.paymentMethodButtonActive
                      ]}
                      onPress={() => setPaymentMethod('upi')}
                    >
                      <Text style={[
                        styles.paymentMethodText,
                        paymentMethod === 'upi' && styles.paymentMethodTextActive
                      ]}>
                        UPI
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Transaction ID (Optional)"
                  value={transactionId}
                  onChangeText={setTransactionId}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setShowPaymentModal(false)}
                  >
                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSubmit]}
                    onPress={handlePaymentSubmit}
                  >
                    <Text style={styles.modalButtonTextSubmit}>Pay</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  summaryCard: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: colors.text,
  },
  filterTextActive: {
    color: colors.white,
  },
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  outstandingItem: {
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
  outstandingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  outstandingInfo: {
    flex: 1,
  },
  outstandingInvoice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  outstandingOrderId: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'capitalize',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dueDateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  overdueText: {
    color: '#F44336',
    fontWeight: '600',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalInfo: {
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  paymentMethodContainer: {
    marginBottom: 16,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  paymentMethodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  paymentMethodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentMethodText: {
    fontSize: 14,
    color: colors.text,
  },
  paymentMethodTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonSubmit: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextSubmit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default OutstandingScreen;

