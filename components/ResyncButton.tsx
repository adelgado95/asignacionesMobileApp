import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { useDataSync } from '@/lib/dataSync';
import { useTheme } from '@/lib/theme';

// Header button: reloads all the data from the server now.
export function ResyncButton() {
  const { syncing, resync } = useDataSync();
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={resync}
      disabled={syncing}
      accessibilityRole="button"
      accessibilityLabel="Resincronizar datos"
      accessibilityState={{ busy: syncing }}
      hitSlop={4}
      style={({ pressed }) => [styles.button, pressed && { backgroundColor: palette.border }]}>
      {syncing ? (
        <ActivityIndicator size={18} color={palette.primary} />
      ) : (
        <Ionicons name="sync-outline" size={22} color={palette.text} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
});
