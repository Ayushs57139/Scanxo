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

const KYCMainScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending');

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  const loadUserAndProfile = async () => {
    try {
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        setUserId(user.id || user.phone);
        loadProfile(user.id || user.phone);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadProfile = async (uid) => {
    setLoading(true);
    
    // Set loading to false after max 2 seconds to show screen immediately
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    try {
      const profileData = await kycAPI.getProfile(uid);
      clearTimeout(loadingTimeout);
      if (profileData) {
        setProfile(profileData);
        setVerificationStatus(profileData.verificationStatus || 'pending');
      }
      setLoading(false);
    } catch (error) {
      clearTimeout(loadingTimeout);
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return colors.error;
      case 'pending': return '#FF9800';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'rejected': return 'cancel';
      case 'pending': return 'pending';
      default: return 'info';
    }
  };

  const menuItems = [
    {
      id: 1,
      title: 'KYC Profile',
      description: 'Personal information and identity details',
      icon: 'person',
      screen: 'KYCProfile',
      color: '#2196F3',
    },
    {
      id: 2,
      title: 'Documents',
      description: 'Upload and manage KYC documents',
      icon: 'description',
      screen: 'KYCDocuments',
      color: '#FF9800',
    },
    {
      id: 3,
      title: 'Business License',
      description: 'Business license information',
      icon: 'business',
      screen: 'BusinessLicense',
      color: '#9C27B0',
    },
    {
      id: 4,
      title: 'GST Information',
      description: 'GST registration and tax details',
      icon: 'receipt',
      screen: 'GSTInfo',
      color: '#4CAF50',
    },
    {
      id: 5,
      title: 'Credit Limit',
      description: 'View credit limit and utilization',
      icon: 'account-balance-wallet',
      screen: 'CreditLimit',
      color: '#F44336',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
        {verificationStatus && (
          <View style={[styles.statusCard, { borderColor: getStatusColor(verificationStatus) }]}>
            <View style={styles.statusHeader}>
              <Icon
                name={getStatusIcon(verificationStatus)}
                size={32}
                color={getStatusColor(verificationStatus)}
              />
              <View style={styles.statusContent}>
                <Text style={styles.statusTitle}>Verification Status</Text>
                <Text style={[styles.statusValue, { color: getStatusColor(verificationStatus) }]}>
                  {verificationStatus.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.statusDescription}>
              {verificationStatus === 'approved'
                ? 'Your KYC verification has been approved. You can now access all features.'
                : verificationStatus === 'rejected'
                ? 'Your KYC verification was rejected. Please update your information and resubmit.'
                : 'Your KYC verification is pending. Please complete all sections and submit for review.'}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KYC Sections</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Icon name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Icon name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About KYC Verification</Text>
            <Text style={styles.infoText}>
              Complete your KYC verification to access all features and services. 
              Please ensure all information is accurate and documents are clear and valid.
            </Text>
          </View>
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
    backgroundColor: colors.white,
    padding: 20,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContent: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: colors.textSecondary,
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
});

export default KYCMainScreen;

