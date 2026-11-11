import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';

import { Select } from '@/components/Select';
import type { Palette } from '@/constants/Colors';
import { useThemed } from '@/lib/theme';
import { MONTHS } from '@/lib/dates';
import { ResyncButton } from '@/components/ResyncButton';
import { MenuButton } from '@/lib/sideMenu';
import {
  RELATION_LABEL,
  addWeeks,
  firstWeekOfMonth,
  formatWeekRange,
  monthOfWeek,
  relationToNow,
} from '@/lib/weeks';


export type WeekHeaderProps = {
  /** Monday of the selected week. */
  value: Date;
  onChange: (weekStart: Date) => void;
  onLogout: () => void;
  congregation: string;
  title?: string;
};

// Top of the "Vida y Ministerio" screen: title, congregation, month/year and week navigation.
// State lives in the parent (value / onChange) so it can load the program for the chosen week.
export function WeekHeader({ value, onChange, onLogout, congregation, title = 'Vida y Ministerio' }: WeekHeaderProps) {
  const insets = useSafeAreaInsets();
  const { palette, styles } = useThemed(makeStyles);
  const { month, year } = monthOfWeek(value);
  const range = formatWeekRange(value);
  const relation = relationToNow(value);
  const relationLabel = relation ? RELATION_LABEL[relation] : null;

  // Years: current -1 .. current +1 (plus the selected one if arrows took the week outside that range).
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([currentYear - 1, currentYear, currentYear + 1, year])).sort((a, b) => a - b);

  // Tell screen readers about week changes (not on first render).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    AccessibilityInfo.announceForAccessibility(`Semana ${range}${relationLabel ? `, ${relationLabel.toLowerCase()}` : ''}`);
  }, [value.getTime()]);

  return (
    <View style={styles.block}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <View style={styles.titleRow}>
        <MenuButton />
        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.congregationRow}>
            <Ionicons name="location-outline" size={14} color={palette.secondaryText} />
            <Text style={styles.congregation}>{congregation}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <ResyncButton />
          <Pressable
            onPress={onLogout}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, styles.logout, pressed && styles.pressed]}>
            <Ionicons name="log-out-outline" size={22} color={palette.text} />
          </Pressable>
        </View>
      </View>
      </View>

      <View style={styles.selectRow}>
        <Select
          compact
          style={styles.month}
          label="Mes"
          value={MONTHS[month - 1].label}
          options={MONTHS.map((m) => ({
            key: String(m.value),
            label: m.label,
            selected: month === m.value,
            onSelect: () => onChange(firstWeekOfMonth(year, m.value)),
          }))}
        />
        <Select
          compact
          style={styles.year}
          label="Año"
          value={String(year)}
          options={years.map((y) => ({
            key: String(y),
            label: String(y),
            selected: year === y,
            onSelect: () => onChange(firstWeekOfMonth(y, month)),
          }))}
        />
      </View>

      <View style={styles.weekBox}>
        <Pressable
          onPress={() => onChange(addWeeks(value, -1))}
          accessibilityRole="button"
          accessibilityLabel="Semana anterior"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <View style={styles.weekCenter}>
          <Text style={styles.weekRange} accessibilityLiveRegion="polite">
            {range}
          </Text>
          {relationLabel && (
            <Text style={[styles.weekRelation, relation === 'actual' && styles.weekRelationNow]}>{relationLabel}</Text>
          )}
        </View>
        <Pressable
          onPress={() => onChange(addWeeks(value, 1))}
          accessibilityRole="button"
          accessibilityLabel="Semana siguiente"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="chevron-forward" size={24} color={palette.text} />
        </Pressable>
      </View>
    </View>
  );
}

// Spacing scale: 4, 8, 12, 16, 20, 24. Two weights only: 400 and 500.
// One container owns the 20 px side padding, so title, selects, week box and the logout icon share the same edges.
// Vertical rhythm: 16 above the title, then 16 / 16 / 16 (header -> month and year -> week box -> next section).
const makeStyles = (palette: Palette) => {
  return StyleSheet.create({
  block: { paddingHorizontal: 20, paddingBottom: 16 },
  header: { paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: palette.text, fontSize: 22, lineHeight: 28, fontWeight: '500' },
  congregationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  congregation: { flexShrink: 1, color: palette.secondaryText, fontSize: 13, lineHeight: 16, fontWeight: '400' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  // The 22 px icon sits centered in a 44 px target: pull the target out by 10 so the icon's edge meets the right margin.
  logout: { marginRight: -10 },
  pressed: { backgroundColor: palette.border },
  selectRow: { flexDirection: 'row', gap: 12 },
  month: { flex: 1.4, minWidth: 0 },
  year: { flex: 1, minWidth: 0 },
  weekBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: palette.background,
  },
  weekCenter: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  weekRange: { color: palette.text, fontSize: 16, lineHeight: 20, fontWeight: '500', textAlign: 'center' },
  weekRelation: { color: palette.secondaryText, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  weekRelationNow: { color: palette.primary, fontWeight: '500' },
});
};
