import { Platform } from 'react-native';

// Override with EXPO_PUBLIC_API_URL (e.g. http://192.168.1.50:8000) for a physical device
// or a deployed backend. Defaults target the local docker-compose backend (port 8000).
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'; // 10.0.2.2 = host from Android emulator

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? `http://${DEFAULT_HOST}:8000`).replace(/\/$/, '');
