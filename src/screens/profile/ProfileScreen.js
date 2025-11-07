import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import colors from '../../constants/colors';
import { StorageKeys, storage } from '../../utils/storage';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    loadUser();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUser();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUser = async () => {
    const userData = await storage.getItem(StorageKeys.USER_DATA);
    if (userData) {
      const userObj = userData; // storage.getItem already parses JSON
      setUser(userObj);
      
      // Load profile image if exists
      const savedImage = await AsyncStorage.getItem(StorageKeys.PROFILE_IMAGE);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('KYCProfile');
  };

  const handleChangeProfilePicture = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      await AsyncStorage.setItem(StorageKeys.PROFILE_IMAGE, result.assets[0].uri);
    }
  };

  const handleFavorites = () => {
    navigation.navigate('Favorites');
  };

  const handleOrderHistory = () => {
    navigation.navigate('OrdersTab');
  };

  const handleDistributors = () => {
      navigation.navigate('Distributors');
  };

  const handlePrescription = () => {
    navigation.navigate('Prescription');
  };

  const handleOutstandings = () => {
    navigation.navigate('Outstanding');
  };

  const handleSendFeedback = () => {
    navigation.navigate('Feedback');
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleContactUs = () => {
    Linking.openURL('tel:+917057527530');
  };

  const handleEmailUs = () => {
    Linking.openURL('mailto:support@scanxo.com');
  };

  const handleTermsConditions = () => {
    navigation.navigate('TermsConditions');
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(StorageKeys.USER_TOKEN);
            await AsyncStorage.removeItem(StorageKeys.USER_DATA);
            await AsyncStorage.removeItem(StorageKeys.PROFILE_IMAGE);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const userName = user?.name || user?.storeName || 'User Name';
  const userPhone = user?.phone || '+91 7057527530';
  const userEmail = user?.email || 'user@scanxo.com';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Account</Text>
        <TouchableOpacity onPress={() => Alert.alert('Notifications', 'Notification center')}>
          <Icon name="notifications" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={handleChangeProfilePicture}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Icon name="person" size={50} color={colors.white} />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Icon name="camera-alt" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.userName} numberOfLines={2}>{userName}</Text>
            <View style={styles.infoRow}>
              <Icon name="phone" size={16} color={colors.white} />
              <Text style={styles.infoText}>{userPhone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="email" size={16} color={colors.white} />
              <Text style={styles.infoText}>{userEmail}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editIcon} onPress={handleEditProfile}>
            <Icon name="edit" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* YOUR Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleFavorites}>
              <View style={styles.menuItemLeft}>
                <Icon name="favorite" size={24} color="#FF6B35" />
                <Text style={styles.menuItemText}>Favorite items</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleOrderHistory}>
              <View style={styles.menuItemLeft}>
                <Icon name="history" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Order history</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleDistributors}>
              <View style={styles.menuItemLeft}>
                <Icon name="account-tree" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Distributors</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePrescription}>
              <View style={styles.menuItemLeft}>
                <Icon name="add-box" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Prescription</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleOutstandings}>
              <View style={styles.menuItemLeft}>
                <View style={styles.rupeeIcon}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                </View>
                <Text style={styles.menuItemText}>Outstandings</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* MORE Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MORE</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleSendFeedback}>
              <View style={styles.menuItemLeft}>
                <Icon name="feedback" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Send feedback</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
              <View style={styles.menuItemLeft}>
                <Icon name="lock" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Change password</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleContactUs}>
              <View style={styles.menuItemLeft}>
                <Icon name="phone" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Contact us</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleEmailUs}>
              <View style={styles.menuItemLeft}>
                <Icon name="email" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Email us</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ABOUT Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleTermsConditions}>
              <View style={styles.menuItemLeft}>
                <Icon name="info" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Terms & conditions</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
              <View style={styles.menuItemLeft}>
                <Icon name="privacy-tip" size={24} color={colors.primary} />
                <Text style={styles.menuItemText}>Privacy policy</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={styles.menuItemLeft}>
                <Icon name="power-settings-new" size={24} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>Logout</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Scanxo</Text>
          <Text style={styles.versionNumber}>V1.4.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#1E3A8A',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.white,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.white,
    marginLeft: 8,
  },
  editIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  menuContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 16,
    fontWeight: '500',
  },
  rupeeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rupeeSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  versionNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default ProfileScreen;
