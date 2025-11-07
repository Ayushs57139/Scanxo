import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../../constants/colors';

const PrescriptionScreen = ({ navigation }) => {
  const [prescriptions, setPrescriptions] = useState([]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload prescriptions');
      return false;
    }
    return true;
  };

  const handleUploadPrescription = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPrescription = {
        id: Date.now(),
        uri: result.assets[0].uri,
        date: new Date().toISOString(),
        status: 'pending',
      };
      setPrescriptions([newPrescription, ...prescriptions]);
      Alert.alert('Success', 'Prescription uploaded successfully! Our team will review it soon.');
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera permissions to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPrescription = {
        id: Date.now(),
        uri: result.assets[0].uri,
        date: new Date().toISOString(),
        status: 'pending',
      };
      setPrescriptions([newPrescription, ...prescriptions]);
      Alert.alert('Success', 'Prescription photo taken successfully! Our team will review it soon.');
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Upload Prescription',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handleUploadPrescription },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Prescriptions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Upload Prescription</Text>
          <Text style={styles.sectionDescription}>
            Upload your prescription and our team will review it. You can order medicines based on approved prescriptions.
          </Text>
          <View style={styles.uploadButtons}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showUploadOptions}
            >
              <Icon name="cloud-upload" size={32} color={colors.white} />
              <Text style={styles.uploadButtonText}>Upload Prescription</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.prescriptionsSection}>
          <Text style={styles.sectionTitle}>Uploaded Prescriptions</Text>
          {prescriptions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="description" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No prescriptions uploaded yet</Text>
              <Text style={styles.emptySubtext}>
                Upload your prescription to get started
              </Text>
            </View>
          ) : (
            prescriptions.map((prescription) => (
              <View key={prescription.id} style={styles.prescriptionCard}>
                <Image
                  source={{ uri: prescription.uri }}
                  style={styles.prescriptionImage}
                  resizeMode="cover"
                />
                <View style={styles.prescriptionInfo}>
                  <View style={styles.prescriptionHeader}>
                    <Text style={styles.prescriptionDate}>
                      {new Date(prescription.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(prescription.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(prescription.status) }]}>
                        {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {prescription.status === 'pending' && (
                    <Text style={styles.pendingText}>
                      Under review by our team
                    </Text>
                  )}
                  {prescription.status === 'approved' && (
                    <TouchableOpacity style={styles.orderButton}>
                      <Text style={styles.orderButtonText}>Order Medicines</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  uploadSection: {
    backgroundColor: colors.white,
    padding: 20,
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  prescriptionsSection: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
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
  prescriptionCard: {
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
  prescriptionImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.lightGray,
  },
  prescriptionInfo: {
    padding: 16,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prescriptionDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  orderButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  orderButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PrescriptionScreen;

