// API base URL for the shared Express server
// For device testing, replace localhost with your machine's LAN IP, e.g. http://192.168.1.10:4000/api
// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, use localhost
// For physical device, use your computer's IP address

// Auto-detect platform and set appropriate URL
import { Platform } from 'react-native';

let API_BASE_URL = 'http://localhost:4000/api';

if (Platform.OS === 'android') {
  // Android emulator - try 10.0.2.2 first, fallback to actual IP
  // For physical device, use your computer's IP address instead
  // Using actual IP address for better connectivity
  API_BASE_URL = 'http://192.168.1.19:4000/api';
} else if (Platform.OS === 'ios') {
  // iOS simulator
  API_BASE_URL = 'http://localhost:4000/api';
}

console.log('API_BASE_URL configured for', Platform.OS, ':', API_BASE_URL);

export { API_BASE_URL };



