import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import 'react-native-reanimated';

import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { AuthProvider, useAuth } from '@/lib/auth';
import { AppThemeProvider, useTheme } from '@/lib/theme';

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

// Navigation + Paper themes follow the palette chosen with the dark-mode switch.
function ThemedApp() {
  const { palette, isDark } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: palette.background,
        card: palette.surface,
        text: palette.text,
        primary: palette.primary,
        border: palette.border,
      },
    };
  }, [palette, isDark]);

  const paperTheme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.primary,
        onPrimary: palette.onPrimary,
        background: palette.background,
        surface: palette.surface,
        onSurface: palette.text,
        onSurfaceVariant: palette.secondaryText,
        outline: palette.border,
        secondary: '#25A59A',
        error: palette.danger,
      },
    };
  }, [palette, isDark]);

  return (
    <ThemeProvider value={navTheme}>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </PaperProvider>
    </ThemeProvider>
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
    <AppThemeProvider>
      <ThemedApp />
    </AppThemeProvider>
  );
}
