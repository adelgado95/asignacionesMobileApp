import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';

import { AuthProvider, useAuth } from '@/lib/auth';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    primary: Colors.light.primary,
    border: Colors.light.border,
  },
};

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.light.primary,
    onPrimary: '#FFFFFF',
    background: Colors.light.background,
    surface: Colors.light.surface,
    onSurface: Colors.light.text,
    outline: Colors.light.border,
    secondary: '#25A59A',
    error: Colors.light.danger,
  },
};

function RootNavigator() {
  const { status } = useAuth();

  // Wait for the stored session to load so the login screen doesn't flash.
  if (status === 'loading') return null;
  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" options={{ headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={navTheme}>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      <StatusBar style="dark" />
      </PaperProvider>
    </ThemeProvider>
  );
}
