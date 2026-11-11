import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Switch, Text } from 'react-native-paper';

import type { Palette } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { useTheme, useThemed } from '@/lib/theme';
const WIDTH = Math.min(320, Math.round(Dimensions.get('window').width * 0.82));

type Ctx = { open: () => void; close: () => void };
const SideMenuContext = createContext<Ctx | null>(null);

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const SECTIONS: { label: string; icon: IconName; href: Href; path: string }[] = [
  { label: 'VyMC', icon: 'book-outline', href: '/vymc', path: '/vymc' },
  { label: 'Privilegios', icon: 'people-outline', href: '/privilegios', path: '/privilegios' },
  { label: 'Escuela', icon: 'school-outline', href: '/', path: '/' },
  { label: 'Mis partes', icon: 'person-outline', href: '/mis-partes', path: '/mis-partes' },
];

// Placeholders for future sections: shown but not tappable.
const COMING: { label: string; icon: IconName }[] = [
  { label: 'Predicación', icon: 'megaphone-outline' },
  { label: 'Informes', icon: 'stats-chart-outline' },
  { label: 'Anuncios', icon: 'notifications-outline' },
  { label: 'Configuración', icon: 'settings-outline' },
];

// Side menu that slides over the tabs from the left. Screens open it with `useSideMenu().open()`.
export function SideMenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false); // mounted/interactive
  const progress = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const insets = useSafeAreaInsets();
  const { palette, styles } = useThemed(makeStyles);
  const { isDark, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  const animate = useCallback(
    (to: 0 | 1, done?: () => void) =>
      Animated.timing(progress, { toValue: to, duration: 220, useNativeDriver: true }).start(done),
    [progress],
  );
  const open = useCallback(() => {
    setVisible(true);
    animate(1);
  }, [animate]);
  const close = useCallback(() => animate(0, () => setVisible(false)), [animate]);

  // Android back button closes the menu first.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [visible, close]);

  const value = useMemo(() => ({ open, close }), [open, close]);
  const go = (href: Href) => {
    close();
    router.navigate(href);
  };

  return (
    <SideMenuContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {visible && (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
            <Animated.View style={[styles.scrim, { opacity: progress }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Cerrar menú" />
            </Animated.View>
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.panel,
                {
                  width: WIDTH,
                  paddingTop: insets.top + 16,
                  paddingBottom: insets.bottom + 16,
                  transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-WIDTH, 0] }) }],
                },
              ]}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle} accessibilityRole="header">
                  Menú
                </Text>
                <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar menú" style={styles.iconButton}>
                  <Ionicons name="close" size={24} color={palette.text} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.list}>
                <Text style={styles.group}>Secciones</Text>
                {SECTIONS.map((s) => {
                  const active = pathname === s.path;
                  return (
                    <Pressable
                      key={s.label}
                      onPress={() => go(s.href)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.pressed]}>
                      <Ionicons name={s.icon} size={22} color={active ? palette.primary : palette.text} />
                      <Text style={[styles.itemText, active && { color: palette.primary }]}>{s.label}</Text>
                    </Pressable>
                  );
                })}

                <Text style={[styles.group, styles.groupGap]}>Próximamente</Text>
                {COMING.map((c) => (
                  <View
                    key={c.label}
                    accessible
                    accessibilityState={{ disabled: true }}
                    accessibilityLabel={`${c.label}, próximamente`}
                    style={[styles.item, styles.itemDisabled]}>
                    <Ionicons name={c.icon} size={22} color={palette.icon} />
                    <Text style={[styles.itemText, { color: palette.secondaryText }]}>{c.label}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Próximamente</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={[styles.item, styles.themeRow]}>
                <Ionicons name={isDark ? 'moon' : 'moon-outline'} size={22} color={palette.text} />
                <Text style={styles.itemText}>Modo oscuro</Text>
                <Switch value={isDark} onValueChange={toggle} accessibilityLabel="Modo oscuro" />
              </View>

              <Pressable
                onPress={() => {
                  close();
                  signOut();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, styles.logout, pressed && styles.pressed]}>
                <Ionicons name="log-out-outline" size={22} color={palette.text} />
                <Text style={styles.itemText}>Cerrar sesión</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}
      </View>
    </SideMenuContext.Provider>
  );
}

export function useSideMenu() {
  const ctx = useContext(SideMenuContext);
  return ctx ?? { open: () => {}, close: () => {} };
}

// Hamburger button for screen headers.
export function MenuButton() {
  const { open } = useSideMenu();
  const { palette, styles } = useThemed(makeStyles);
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Abrir menú"
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, styles.menuButton, pressed && styles.pressed]}>
      <Ionicons name="menu" size={26} color={palette.text} />
    </Pressable>
  );
}

// Spacing scale 4/8/12/16/20/24, touch targets >= 44 px.
const makeStyles = (palette: Palette) => StyleSheet.create({
  root: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(31,42,61,0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: palette.surface,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  panelTitle: { color: palette.text, fontSize: 22, lineHeight: 28, fontWeight: '500' },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  group: { color: palette.secondaryText, fontSize: 12, lineHeight: 16, fontWeight: '500', paddingHorizontal: 8, paddingVertical: 8 },
  groupGap: { marginTop: 16 },
  item: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 8, borderRadius: 12 },
  itemActive: { backgroundColor: palette.background },
  itemDisabled: { opacity: 0.8 },
  itemText: { flex: 1, color: palette.text, fontSize: 16, lineHeight: 20, fontWeight: '400' },
  pressed: { backgroundColor: palette.border },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: palette.background },
  badgeText: { color: palette.secondaryText, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  themeRow: { marginHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border, borderRadius: 0 },
  logout: { marginHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border, borderRadius: 0 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  menuButton: { marginLeft: -10 }, // the 26 px icon's edge meets the screen margin
});
