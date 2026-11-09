import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL in .env (production: https://central.admincong.online; a local backend: http://192.168.1.50:8000).
// Without it the app targets the local docker-compose backend (port 8000).
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'; // 10.0.2.2 = host from Android emulator

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? `http://${DEFAULT_HOST}:8000`).replace(/\/$/, '');
