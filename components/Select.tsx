import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu, Text } from 'react-native-paper';

import { Colors } from '@/constants/Colors';

const palette = Colors.light;
const INK = palette.text;
const MUTED = palette.secondaryText;

export type SelectOption = { key: string; label: string; selected: boolean; onSelect: () => void };

// Form-style combobox: label above, bordered field with chevron, menu as wide as the field.
export function Select({
  label,
  value,
  options,
  disabled,
  compact,
  style,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  disabled?: boolean;
  compact?: boolean; // 44 px field and 12 px label, for dense headers
  style?: object;
}) {
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Text style={[styles.selectLabel, compact && styles.selectLabelCompact]}>{label}</Text>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchorPosition="bottom"
        contentStyle={[styles.dropdownMenu, { width }]}
        anchor={
          <Pressable
            onPress={() => setVisible(true)}
            disabled={disabled}
            accessibilityRole="combobox"
            accessibilityLabel={`${label}: ${value}`}
            style={[styles.select, compact && styles.selectCompact, visible && styles.selectOpen, disabled && styles.selectDisabled]}>
            <Text style={styles.selectValue} numberOfLines={1}>
              {value}
            </Text>
            <Ionicons name="chevron-down" size={18} color={MUTED} />
          </Pressable>
        }>
        {options.map((o) => (
          <Menu.Item
            key={o.key}
            title={o.label}
            onPress={() => {
              o.onSelect();
              setVisible(false);
            }}
            titleStyle={[styles.dropdownItemText, o.selected && styles.dropdownItemTextActive]}
            style={styles.dropdownItem}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  selectLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  selectLabelCompact: { fontSize: 12, fontWeight: '400', marginBottom: 4 },
  selectCompact: { minHeight: 44 },
  select: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9D2E3',
    backgroundColor: palette.surface,
  },
  selectOpen: {
    borderColor: palette.primary,
    borderWidth: 2,
    paddingHorizontal: 13,
  },
  selectDisabled: {
    backgroundColor: '#F4F6FA',
    opacity: 0.7,
  },
  selectValue: {
    flex: 1,
    color: INK,
    fontSize: 16,
  },
  dropdownMenu: {
    backgroundColor: palette.surface,
    borderRadius: 10,
  },
  dropdownItem: {
    minHeight: 48,
  },
  dropdownItemText: {
    color: INK,
    fontSize: 16,
  },
  dropdownItemTextActive: {
    color: palette.primary,
    fontWeight: '700',
  },
});
