import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';

import type { Palette } from '@/constants/Colors';
import { CONGREGATION } from '@/constants/congregation';
import { useThemed } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ResyncButton } from '@/components/ResyncButton';
import { MenuButton } from '@/lib/sideMenu';

// Same header as "Vida y Ministerio" (WeekHeader): menu, title with the congregation under it, resync and a
// log-out icon. Side padding comes from the screen (20 px); the top inset is handled here.
export function ScreenHeader({ title }: { title: string }) {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { palette, styles } = useThemed(makeStyles);
  return (
    <View style={[styles.row, { paddingTop: insets.top + 16 }]}>
      <MenuButton />
      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.congregationRow}>
          <Ionicons name="location-outline" size={14} color={palette.secondaryText} />
          <Text style={styles.congregation}>{CONGREGATION}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <ResyncButton />
        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, styles.logout, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={22} color={palette.text} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    titleBlock: { flex: 1, minWidth: 0, gap: 4 },
    title: { color: palette.text, fontSize: 22, lineHeight: 28, fontWeight: '500' },
    congregationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    congregation: { flexShrink: 1, color: palette.secondaryText, fontSize: 13, lineHeight: 16, fontWeight: '400' },
    actions: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
    logout: { marginRight: -10 }, // icon edge meets the right margin
    pressed: { backgroundColor: palette.border },
  });
