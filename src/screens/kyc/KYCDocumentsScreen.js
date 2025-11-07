import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { StorageKeys, storage } from '../../utils/storage';
import { kycAPI } from '../../services/api';
import { API_BASE_URL } from '../../constants/config';

const KYCDocumentsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedType, setSelectedType] = useState('aadhaar');

  const documentTypes = [
    { id: 'aadhaar', label: 'Aadhaar Card', icon: 'badge' },
    { id: 'pan', label: 'PAN Card', icon: 'credit-card' },
    { id: 'passport', label: 'Passport', icon: 'book' },
    { id: 'driving-license', label: 'Driving License', icon: 'directions-car' },
    { id: 'business-license', label: 'Business License', icon: 'business' },
    { id: 'gst-certificate', label: 'GST Certificate', icon: 'receipt' },
    { id: 'bank-statement', label: 'Bank Statement', icon: 'account-balance' },
    { id: 'other', label: 'Other', icon: 'description' },
  ];

  useEffect(() => {
    loadUserAndDocuments();
  }, []);

  const loadUserAndDocuments = async () => {
    try {
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        setUserId(user.id || user.phone);
        loadDocuments(user.id || user.phone);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadDocuments = async (uid) => {
    setLoading(true);
    try {
      const docs = await kycAPI.getDocuments(uid);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Media library permission is required');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          allowsMultipleSelection: false,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadDocument(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadDocument = async (asset) => {
    if (!userId) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    setUploading(true);
    try {
      const file = {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `document-${Date.now()}.jpg`,
      };

      await kycAPI.uploadDocuments(userId, selectedType, [file]);
      Alert.alert('Success', 'Document uploaded successfully');
      loadDocuments(userId);
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Upload Document',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => pickImage('camera') },
        { text: 'Gallery', onPress: () => pickImage('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return colors.error;
      case 'pending': return '#FF9800';
      default: return colors.textSecondary;
    }
  };

  const getDocumentTypeLabel = (type) => {
    const docType = documentTypes.find(dt => dt.id === type);
    return docType ? docType.label : type;
  };

  const renderDocument = ({ item }) => (
    <View style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <View style={styles.documentInfo}>
          <Icon name="description" size={24} color={colors.primary} />
          <View style={styles.documentDetails}>
            <Text style={styles.documentType}>{getDocumentTypeLabel(item.documentType)}</Text>
            <Text style={styles.documentName}>{item.fileName}</Text>
            <Text style={styles.documentDate}>
              Uploaded: {new Date(item.uploadedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      {item.filePath && (
        <Image
          source={{ uri: `${API_BASE_URL.replace('/api', '')}${item.filePath}` }}
          style={styles.documentImage}
          resizeMode="contain"
        />
      )}
    </View>
  );

  const filteredDocuments = documents.filter(doc => doc.documentType === selectedType);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Documents</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
        {documentTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeChip,
              selectedType === type.id && styles.typeChipActive,
            ]}
            onPress={() => setSelectedType(type.id)}
          >
            <Icon
              name={type.icon}
              size={20}
              color={selectedType === type.id ? colors.white : colors.primary}
            />
            <Text
              style={[
                styles.typeChipText,
                selectedType === type.id && styles.typeChipTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.uploadSection}>
            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={showUploadOptions}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Icon name="cloud-upload" size={24} color={colors.white} />
                  <Text style={styles.uploadButtonText}>Upload {getDocumentTypeLabel(selectedType)}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {filteredDocuments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="description" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No documents uploaded</Text>
              <Text style={styles.emptySubtext}>
                Upload your {getDocumentTypeLabel(selectedType)} to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredDocuments}
              renderItem={renderDocument}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.documentsList}
            />
          )}
        </View>
      )}
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
  typeSelector: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 6,
  },
  typeChipTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  uploadSection: {
    padding: 16,
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  documentsList: {
    padding: 16,
  },
  documentCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  documentInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  documentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  documentName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  documentDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  documentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
  },
});

export default KYCDocumentsScreen;

