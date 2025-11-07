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
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { StorageKeys, storage } from '../../utils/storage';
import { kycAPI } from '../../services/api';

const BusinessLicenseScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [license, setLicense] = useState({
    licenseNumber: '',
    licenseType: '',
    issueDate: '',
    expiryDate: '',
    issuingAuthority: '',
    businessName: '',
    businessAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
    businessType: '',
    registrationNumber: '',
  });

  useEffect(() => {
    loadUserAndLicense();
  }, []);

  const loadUserAndLicense = async () => {
    try {
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        setUserId(user.id || user.phone);
        loadLicense(user.id || user.phone);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadLicense = async (uid) => {
    setLoading(true);
    
    // Set loading to false after max 2 seconds to show screen immediately
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    try {
      const licenseData = await kycAPI.getBusinessLicense(uid);
      clearTimeout(loadingTimeout);
      if (licenseData) {
        setLicense(licenseData);
      }
      setLoading(false);
    } catch (error) {
      clearTimeout(loadingTimeout);
      // License not found, use empty form
      console.log('License not found, using empty form');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!license.licenseNumber || !license.businessName) {
      Alert.alert('Validation Error', 'Please fill in license number and business name');
      return;
    }

    setLoading(true);
    try {
      await kycAPI.updateBusinessLicense(userId, license);
      Alert.alert('Success', 'Business license saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save business license. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setLicense(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setLicense(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business License</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {loading && !license.licenseNumber ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>License Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>License Number *</Text>
            <TextInput
              style={styles.input}
              value={license.licenseNumber}
              onChangeText={(text) => updateField('licenseNumber', text)}
              placeholder="Enter license number"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>License Type</Text>
            <TextInput
              style={styles.input}
              value={license.licenseType}
              onChangeText={(text) => updateField('licenseType', text)}
              placeholder="e.g., Drug License, Trade License"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Issue Date</Text>
              <TextInput
                style={styles.input}
                value={license.issueDate}
                onChangeText={(text) => updateField('issueDate', text)}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Expiry Date</Text>
              <TextInput
                style={styles.input}
                value={license.expiryDate}
                onChangeText={(text) => updateField('expiryDate', text)}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Issuing Authority</Text>
            <TextInput
              style={styles.input}
              value={license.issuingAuthority}
              onChangeText={(text) => updateField('issuingAuthority', text)}
              placeholder="Enter issuing authority"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={license.businessName}
              onChangeText={(text) => updateField('businessName', text)}
              placeholder="Enter business name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Business Type</Text>
            <TextInput
              style={styles.input}
              value={license.businessType}
              onChangeText={(text) => updateField('businessType', text)}
              placeholder="e.g., Proprietorship, Partnership, LLP, Company"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Registration Number</Text>
            <TextInput
              style={styles.input}
              value={license.registrationNumber}
              onChangeText={(text) => updateField('registrationNumber', text)}
              placeholder="Enter registration number"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Address</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={styles.input}
              value={license.businessAddress?.street}
              onChangeText={(text) => updateField('businessAddress.street', text)}
              placeholder="Enter street address"
              multiline
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={license.businessAddress?.city}
                onChangeText={(text) => updateField('businessAddress.city', text)}
                placeholder="Enter city"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={license.businessAddress?.state}
                onChangeText={(text) => updateField('businessAddress.state', text)}
                placeholder="Enter state"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={styles.input}
              value={license.businessAddress?.pincode}
              onChangeText={(text) => updateField('businessAddress.pincode', text)}
              placeholder="Enter pincode"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Icon name="save" size={20} color={colors.white} />
              <Text style={styles.saveButtonText}>Save License</Text>
            </>
          )}
        </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BusinessLicenseScreen;

