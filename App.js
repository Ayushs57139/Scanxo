import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { StorageKeys } from './src/utils/storage';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import OTPScreen from './src/screens/auth/OTPScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import ProductListScreen from './src/screens/products/ProductListScreen';
import ProductDetailScreen from './src/screens/products/ProductDetailScreen';
import CartScreen from './src/screens/cart/CartScreen';
import CheckoutScreen from './src/screens/checkout/CheckoutScreen';
import OrdersScreen from './src/screens/orders/OrdersScreen';
import OrderDetailScreen from './src/screens/orders/OrderDetailScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import DistributorsScreen from './src/screens/distributors/DistributorsScreen';
import RewardsScreen from './src/screens/rewards/RewardsScreen';
import OutstandingScreen from './src/screens/outstanding/OutstandingScreen';
import PrescriptionScreen from './src/screens/prescription/PrescriptionScreen';
import SearchScreen from './src/screens/search/SearchScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import KYCMainScreen from './src/screens/kyc/KYCMainScreen';
import KYCProfileScreen from './src/screens/kyc/KYCProfileScreen';
import KYCDocumentsScreen from './src/screens/kyc/KYCDocumentsScreen';
import BusinessLicenseScreen from './src/screens/kyc/BusinessLicenseScreen';
import GSTInfoScreen from './src/screens/kyc/GSTInfoScreen';
import CreditLimitScreen from './src/screens/kyc/CreditLimitScreen';
import CompanySchemaScreen from './src/screens/company/CompanySchemaScreen';
import FeedbackScreen from './src/screens/feedback/FeedbackScreen';
import ChangePasswordScreen from './src/screens/auth/ChangePasswordScreen';
import FavoritesScreen from './src/screens/favorites/FavoritesScreen';
import TermsConditionsScreen from './src/screens/legal/TermsConditionsScreen';
import PrivacyPolicyScreen from './src/screens/legal/PrivacyPolicyScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = 'home';
          } else if (route.name === 'BrowseTab') {
            iconName = 'store';
          } else if (route.name === 'SearchTab') {
            iconName = 'search';
          } else if (route.name === 'OrdersTab') {
            iconName = 'inventory';
          } else if (route.name === 'CartTab') {
            iconName = 'shopping-cart';
          }

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && route.name === 'HomeTab' && (
                <View style={{
                  position: 'absolute',
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#2196F3',
                  opacity: 0.2,
                }} />
              )}
              <Icon name={iconName} size={focused ? 26 : 24} color={focused ? '#2196F3' : '#9E9E9E'} />
            </View>
          );
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          backgroundColor: '#F5F5F5',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="BrowseTab" component={ProductListScreen} options={{ title: 'Browse' }} />
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="OrdersTab" component={OrdersScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="CartTab" component={CartScreen} options={{ title: 'Cart' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem(StorageKeys.USER_TOKEN);
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator 
          screenOptions={{ headerShown: false }}
          initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
        >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="MainTabs" component={HomeTabs} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="Prescription" component={PrescriptionScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Distributors" component={DistributorsScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />
        <Stack.Screen name="Outstanding" component={OutstandingScreen} />
        <Stack.Screen name="KYCMain" component={KYCMainScreen} />
        <Stack.Screen name="KYCProfile" component={KYCProfileScreen} />
        <Stack.Screen name="KYCDocuments" component={KYCDocumentsScreen} />
        <Stack.Screen name="BusinessLicense" component={BusinessLicenseScreen} />
        <Stack.Screen name="GSTInfo" component={GSTInfoScreen} />
        <Stack.Screen name="CreditLimit" component={CreditLimitScreen} />
        <Stack.Screen name="CompanySchema" component={CompanySchemaScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

