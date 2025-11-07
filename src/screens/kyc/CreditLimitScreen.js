import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { StorageKeys, storage } from '../../utils/storage';
import { kycAPI } from '../../services/api';

const CreditLimitScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [creditLimit, setCreditLimit] = useState({
    currentLimit: 0,
    requestedLimit: 0,
    approvedLimit: 0,
    utilizedAmount: 0,
    availableAmount: 0,
    status: 'pending',
    currency: 'INR',
    lastUpdated: null,
    updatedBy: null,
    notes: '',
  });

  useEffect(() => {
    loadUserAndCreditLimit();
  }, []);

  const loadUserAndCreditLimit = async () => {
    try {
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        setUserId(user.id || user.phone);
        loadCreditLimit(user.id || user.phone);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadCreditLimit = async (uid) => {
    setLoading(true);
    
    // Set loading to false after max 2 seconds to show screen immediately
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    try {
      const creditData = await kycAPI.getCreditLimit(uid);
      clearTimeout(loadingTimeout);
      if (creditData) {
        setCreditLimit(creditData);
      }
      setLoading(false);
    } catch (error) {
      clearTimeout(loadingTimeout);
      // Credit limit not found, use default values
      console.log('Credit limit not found, using default values');
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: creditLimit.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return colors.error;
      case 'pending': return '#FF9800';
      case 'active': return '#2196F3';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'check-circle';
      case 'rejected':
        return 'cancel';
      case 'pending':
        return 'pending';
      default:
        return 'info';
    }
  };

  const availableAmount = creditLimit.approvedLimit - creditLimit.utilizedAmount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit Limit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(creditLimit.status) + '20' }]}>
            <Icon
              name={getStatusIcon(creditLimit.status)}
              size={20}
              color={getStatusColor(creditLimit.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(creditLimit.status) }]}>
              {creditLimit.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Limit Overview</Text>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Approved Limit</Text>
            <Text style={styles.metricValue}>{formatCurrency(creditLimit.approvedLimit || 0)}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Utilized Amount</Text>
            <Text style={[styles.metricValue, { color: colors.error }]}>
              {formatCurrency(creditLimit.utilizedAmount || 0)}
            </Text>
          </View>

          <View style={[styles.metricCard, styles.availableCard]}>
            <Text style={styles.metricLabel}>Available Credit</Text>
            <Text style={[styles.metricValue, { color: '#4CAF50' }]}>
              {formatCurrency(availableAmount)}
            </Text>
          </View>

          {creditLimit.requestedLimit > 0 && creditLimit.requestedLimit !== creditLimit.approvedLimit && (
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Requested Limit</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(creditLimit.requestedLimit)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Limit Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Limit:</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(creditLimit.currentLimit || 0)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Currency:</Text>
            <Text style={styles.detailValue}>{creditLimit.currency || 'INR'}</Text>
          </View>

          {creditLimit.lastUpdated && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Updated:</Text>
              <Text style={styles.detailValue}>
                {new Date(creditLimit.lastUpdated).toLocaleDateString()}
              </Text>
            </View>
          )}

          {creditLimit.updatedBy && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Updated By:</Text>
              <Text style={styles.detailValue}>{creditLimit.updatedBy}</Text>
            </View>
          )}
        </View>

        {creditLimit.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{creditLimit.notes}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Icon name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About Credit Limit</Text>
            <Text style={styles.infoText}>
              Your credit limit is determined based on your KYC verification status, business profile, and transaction history.
              To request a higher limit, please contact support or complete your KYC verification.
            </Text>
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => Alert.alert('Contact Support', 'Please contact support@example.com for credit limit inquiries')}
          >
            <Icon name="support-agent" size={20} color={colors.primary} />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
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
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  statusCard: {
    padding: 16,
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  metricCard: {
    padding: 16,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    marginBottom: 12,
  },
  availableCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionSection: {
    padding: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  contactButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CreditLimitScreen;

