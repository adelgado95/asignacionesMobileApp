import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useHideTabBarOnScroll } from '@/lib/tabBarVisibility';
import { Select } from '@/components/Select';
import { Colors } from '@/constants/Colors';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/lib/auth';
import { MONTHS, YEARS, longDate } from '@/lib/dates';

const palette = Colors.light;
const INK = palette.text;

type Person = { id: number; name: string };
type Programa = {
  id: number;
  fecha: string;
  dia: string;
  [key: string]: Person | string | number | null;
};

// Orden y nombre de cada privilegio; los pares comparten grupo para leerse de un vistazo.
const GROUPS: { title: string; items: { key: string; label: string }[] }[] = [
  { title: 'Presidencia', items: [{ key: 'presidente', label: 'Presidente' }] },
  {
    title: 'Oraciones',
    items: [
      { key: 'oracion_inicio', label: 'Oración inicial' },
      { key: 'oracion_final', label: 'Oración final' },
    ],
  },
  { title: 'Lectura', items: [{ key: 'lector', label: 'Lector' }] },
  {
    title: 'Acomodadores',
    items: [
      { key: 'entrada', label: 'Entrada' },
      { key: 'auditorio', label: 'Auditorio' },
      { key: 'microfono1', label: 'Micrófono 1' },
      { key: 'microfono2', label: 'Micrófono 2' },
      { key: 'plataforma', label: 'Plataforma' },
    ],
  },
  { title: 'Sonido', items: [{ key: 'audio', label: 'Audio' }] },
];

const today = new Date();
const TODAY_ISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export default function PrivilegiosScreen() {
  const { authFetch } = useAuth();
  const scrollProps = useHideTabBarOnScroll();
  const [data, setData] = useState<Programa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(`/api/programa-privilegios/?format=json&month=${month}&year=${year}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      // Solo hoy y las reuniones futuras.
      setData(Array.isArray(json) ? json.filter((p: Programa) => p.fecha >= TODAY_ISO) : []);
    } catch {
      setData([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, year]);

  const nextId = data.find((p) => p.fecha >= TODAY_ISO)?.id;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} {...scrollProps}>
      <ScreenHeader title="Privilegios" />

      <View style={styles.formRow}>
        <Select
          style={styles.monthField}
          label="Mes"
          value={MONTHS[month - 1].label}
          options={MONTHS.map((m) => ({
            key: String(m.value),
            label: m.label,
            selected: month === m.value,
            onSelect: () => setMonth(m.value),
          }))}
        />
        <Select
          style={styles.yearField}
          label="Año"
          value={String(year)}
          options={YEARS.map((y) => ({
            key: String(y),
            label: String(y),
            selected: year === y,
            onSelect: () => setYear(y),
          }))}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator animating size="large" color={palette.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No hay conexión con el servidor</Text>
          <Text style={styles.emptyText}>
            Comprueba que el backend esté en marcha en {API_URL} y vuelve a intentarlo.
          </Text>
          <Button mode="outlined" onPress={load} style={styles.retry}>
            Reintentar
          </Button>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>
            Sin reuniones próximas en {MONTHS[month - 1].label.toLowerCase()} de {year}
          </Text>
          <Text style={styles.emptyText}>Solo se muestran las reuniones de hoy en adelante. Prueba con otro mes.</Text>
        </View>
      ) : (
        data.map((p) => (
          <View key={p.id} style={[styles.card, p.id === nextId && styles.cardNext]}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{longDate(p.fecha)}</Text>
              {p.id === nextId && <Text style={styles.nextTag}>Próxima</Text>}
            </View>
            {GROUPS.map((g) => (
              <View key={g.title} style={styles.group}>
                <Text style={styles.groupTitle}>{g.title}</Text>
                {g.items.map((it) => {
                  const person = p[it.key] as Person | null;
                  return (
                    <View key={it.key} style={styles.row}>
                      <Text style={styles.label}>{it.label}</Text>
                      <Text style={[styles.value, !person && styles.empty]}>{person?.name ?? '—'}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 120, gap: 16 },
  title: { color: INK, fontSize: 26, fontWeight: '800' },
  formRow: { flexDirection: 'row', gap: 12 },
  monthField: { flex: 2 },
  yearField: { flex: 1 },

  centered: { paddingVertical: 40, gap: 6 },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: '700' },
  emptyText: { color: palette.secondaryText, fontSize: 15, lineHeight: 21 },
  retry: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 8 },

  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 14,
  },
  cardNext: { borderColor: palette.primary, borderWidth: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: INK, fontSize: 18, fontWeight: '800', textTransform: 'capitalize', flexShrink: 1 },
  nextTag: { color: palette.primary, fontSize: 13, fontWeight: '700' },

  group: { gap: 2 },
  groupTitle: { color: palette.secondaryText, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    minHeight: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  label: { color: palette.secondaryText, fontSize: 15 },
  value: { color: INK, fontSize: 16, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  empty: { color: palette.tabIconDefault, fontWeight: '400' },
});
