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

const GSTInfoScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [gstInfo, setGstInfo] = useState({
    gstin: '',
    legalName: '',
    tradeName: '',
    registrationDate: '',
    status: 'active',
    businessAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
    contactDetails: {
      email: '',
      phone: '',
    },
    taxDetails: {
      gstRate: '',
      hsnCode: '',
      taxCategory: '',
    },
  });

  useEffect(() => {
    loadUserAndGST();
  }, []);

  const loadUserAndGST = async () => {
    try {
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        setUserId(user.id || user.phone);
        loadGST(user.id || user.phone);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadGST = async (uid) => {
    setLoading(true);
    
    // Set loading to false after max 2 seconds to show screen immediately
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    try {
      const gstData = await kycAPI.getGSTInfo(uid);
      clearTimeout(loadingTimeout);
      if (gstData) {
        setGstInfo(gstData);
      }
      setLoading(false);
    } catch (error) {
      clearTimeout(loadingTimeout);
      // GST info not found, use empty form
      console.log('GST info not found, using empty form');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!gstInfo.gstin) {
      Alert.alert('Validation Error', 'Please enter GSTIN');
      return;
    }

    if (gstInfo.gstin.length !== 15) {
      Alert.alert('Validation Error', 'GSTIN must be 15 characters long');
      return;
    }

    setLoading(true);
    try {
      await kycAPI.updateGSTInfo(userId, gstInfo);
      Alert.alert('Success', 'GST information saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save GST information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    if (field.includes('.')) {
      const parts = field.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        setGstInfo(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }));
      } else if (parts.length === 3) {
        const [parent, child, grandchild] = parts;
        setGstInfo(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [grandchild]: value,
            },
          },
        }));
      }
    } else {
      setGstInfo(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GST Information</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {loading && !gstInfo.gstin ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GST Registration</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>GSTIN *</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.gstin}
              onChangeText={(text) => updateField('gstin', text.toUpperCase())}
              placeholder="Enter 15-digit GSTIN"
              maxLength={15}
            />
            <Text style={styles.helperText}>15 characters: 2 (State) + 10 (PAN) + 3 (Entity)</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Legal Name</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.legalName}
              onChangeText={(text) => updateField('legalName', text)}
              placeholder="Enter legal business name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Trade Name</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.tradeName}
              onChangeText={(text) => updateField('tradeName', text)}
              placeholder="Enter trade name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Registration Date</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.registrationDate}
              onChangeText={(text) => updateField('registrationDate', text)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Status</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.status}
              onChangeText={(text) => updateField('status', text)}
              placeholder="e.g., active, cancelled, suspended"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Address</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.businessAddress?.street}
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
                value={gstInfo.businessAddress?.city}
                onChangeText={(text) => updateField('businessAddress.city', text)}
                placeholder="Enter city"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={gstInfo.businessAddress?.state}
                onChangeText={(text) => updateField('businessAddress.state', text)}
                placeholder="Enter state"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.businessAddress?.pincode}
              onChangeText={(text) => updateField('businessAddress.pincode', text)}
              placeholder="Enter pincode"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.contactDetails?.email}
              onChangeText={(text) => updateField('contactDetails.email', text)}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.contactDetails?.phone}
              onChangeText={(text) => updateField('contactDetails.phone', text)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>GST Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.taxDetails?.gstRate}
              onChangeText={(text) => updateField('taxDetails.gstRate', text)}
              placeholder="e.g., 5, 12, 18, 28"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>HSN Code</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.taxDetails?.hsnCode}
              onChangeText={(text) => updateField('taxDetails.hsnCode', text)}
              placeholder="Enter HSN code"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tax Category</Text>
            <TextInput
              style={styles.input}
              value={gstInfo.taxDetails?.taxCategory}
              onChangeText={(text) => updateField('taxDetails.taxCategory', text)}
              placeholder="e.g., Regular, Composition, Exempt"
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
              <Text style={styles.saveButtonText}>Save GST Info</Text>
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
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
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

export default GSTInfoScreen;

