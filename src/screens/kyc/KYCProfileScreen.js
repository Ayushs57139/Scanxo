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

const KYCProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    panNumber: '',
    aadhaarNumber: '',
    verificationStatus: 'pending',
  });

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  const loadUserAndProfile = async () => {
    try {
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        setUserId(user.id || user.phone);
        
        const existingProfile = await kycAPI.getProfile(user.id || user.phone);
        if (existingProfile) {
          setProfile(existingProfile);
        } else {
          // Initialize with user data
          setProfile(prev => ({
            ...prev,
            email: user.email || '',
            phone: user.phone || '',
            firstName: user.name?.split(' ')[0] || '',
            lastName: user.name?.split(' ').slice(1).join(' ') || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSave = async () => {
    if (!profile.firstName || !profile.lastName || !profile.email || !profile.phone) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let savedProfile;
      if (profile.id) {
        savedProfile = await kycAPI.updateProfile(profile.id, profile);
      } else {
        savedProfile = await kycAPI.createProfile({
          ...profile,
          userId,
          createdAt: new Date().toISOString(),
        });
      }
      setProfile(savedProfile);
      Alert.alert('Success', 'Profile saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfile(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setProfile(prev => ({ ...prev, [field]: value }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return colors.success || '#4CAF50';
      case 'rejected': return colors.error;
      case 'pending': return '#FF9800';
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {profile.verificationStatus && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(profile.verificationStatus) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(profile.verificationStatus) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(profile.verificationStatus) }]}>
              Status: {profile.verificationStatus.toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={profile.firstName}
                onChangeText={(text) => updateField('firstName', text)}
                placeholder="Enter first name"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={profile.lastName}
                onChangeText={(text) => updateField('lastName', text)}
                placeholder="Enter last name"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={profile.email}
              onChangeText={(text) => updateField('email', text)}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={styles.input}
              value={profile.phone}
              onChangeText={(text) => updateField('phone', text)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={profile.dateOfBirth}
              onChangeText={(text) => updateField('dateOfBirth', text)}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={styles.input}
              value={profile.address?.street}
              onChangeText={(text) => updateField('address.street', text)}
              placeholder="Enter street address"
              multiline
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={profile.address?.city}
                onChangeText={(text) => updateField('address.city', text)}
                placeholder="Enter city"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={profile.address?.state}
                onChangeText={(text) => updateField('address.state', text)}
                placeholder="Enter state"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                value={profile.address?.pincode}
                onChangeText={(text) => updateField('address.pincode', text)}
                placeholder="Enter pincode"
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={profile.address?.country || 'India'}
                onChangeText={(text) => updateField('address.country', text)}
                placeholder="Enter country"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Documents</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>PAN Number</Text>
            <TextInput
              style={styles.input}
              value={profile.panNumber}
              onChangeText={(text) => updateField('panNumber', text.toUpperCase())}
              placeholder="Enter PAN number"
              maxLength={10}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Aadhaar Number</Text>
            <TextInput
              style={styles.input}
              value={profile.aadhaarNumber}
              onChangeText={(text) => updateField('aadhaarNumber', text)}
              placeholder="Enter Aadhaar number"
              keyboardType="number-pad"
              maxLength={12}
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
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
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

export default KYCProfileScreen;

