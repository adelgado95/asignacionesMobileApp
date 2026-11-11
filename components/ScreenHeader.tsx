import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { Palette } from '@/constants/Colors';
import { useThemed } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { MenuButton } from '@/lib/sideMenu';


// Screen title with the sign-out action always at the top right, the same on every tab.
export function ScreenHeader({ title }: { title: string }) {
  const { signOut } = useAuth();
  const { styles } = useThemed(makeStyles);
  return (
    <View style={styles.row}>
      <MenuButton />
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Pressable onPress={signOut} accessibilityRole="button" accessibilityLabel="Cerrar sesión" hitSlop={8} style={styles.signOut}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (palette: Palette) => {
  return StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, color: palette.text, fontSize: 26, fontWeight: '800' },
  signOut: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  signOutText: { color: palette.primary, fontSize: 14, fontWeight: '600' },
});
};
