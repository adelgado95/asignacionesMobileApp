import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { ScreenHeader } from '@/components/ScreenHeader';
import type { Palette } from '@/constants/Colors';
import { useOnDataChange } from '@/lib/dataSync';
import { useThemed } from '@/lib/theme';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/lib/auth';
import { MONTHS, parseDay } from '@/lib/dates';
import { useHideTabBarOnScroll } from '@/lib/tabBarVisibility';


type Tipo = 'privilegio' | 'vymc' | 'asignacion';
type Dia = { fecha: string; dia: string; partes: { tipo: Tipo; texto: string }[] };
type Response = { person: { id: number; name: string } | null; dias: Dia[] };

// Same colors as the program: teal, wine and gold mark where each part comes from.
const DOT: Record<Tipo, string> = {
  privilegio: '#387C88',
  vymc: '#7E0024',
  asignacion: '#BE8900',
};

export default function MisPartesScreen() {
  const { palette, styles } = useThemed(makeStyles);
  const { authFetch } = useAuth();
  const scrollProps = useHideTabBarOnScroll();
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (silent = false) => {
    setError(false);
    try {
      const res = await authFetch('/api/mis-partes/?format=json');
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
    } catch {
      if (!silent) {
        setData(null);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Refresh every time the tab is opened, so changes made in Django show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useOnDataChange(() => load(true));

  // Days grouped by month, in date order.
  const months = useMemo(() => {
    const groups: { key: string; label: string; dias: Dia[] }[] = [];
    for (const d of data?.dias ?? []) {
      const key = d.fecha.slice(0, 7);
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        g = { key, label: `${parseDay(d.fecha).month} ${d.fecha.slice(0, 4)}`, dias: [] };
        groups.push(g);
      }
      g.dias.push(d);
    }
    return groups;
  }, [data]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} {...scrollProps}>
      <ScreenHeader title="Mis partes" />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator animating size="large" color={palette.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No hay conexión con el servidor</Text>
          <Text style={styles.emptyText}>Comprueba que el backend esté en marcha en {API_URL} y vuelve a intentarlo.</Text>
          <Button mode="outlined" onPress={() => load()} style={styles.retry}>
            Reintentar
          </Button>
        </View>
      ) : !data?.person ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Tu usuario no está vinculado a una persona</Text>
          <Text style={styles.emptyText}>Pide al administrador que lo vincule en Django para ver aquí tus partes.</Text>
        </View>
      ) : months.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Sin partes próximas</Text>
          <Text style={styles.emptyText}>{data.person.name}, no tienes partes en los próximos 3 meses.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>{data.person.name} · próximos 3 meses</Text>
          {months.map((m) => (
            <View key={m.key}>
              <Text style={styles.month}>{m.label}</Text>
              {m.dias.map((d, i) => {
                const { day, weekday } = parseDay(d.fecha);
                return (
                  <View key={d.fecha} style={[styles.row, i > 0 && styles.rowDivider]}>
                    <View style={styles.date}>
                      <Text style={styles.dayNumber}>{day}</Text>
                      <Text style={styles.weekday}>{weekday.slice(0, 3)}</Text>
                    </View>
                    <View style={styles.parts}>
                      {d.partes.map((p) => (
                        <View key={p.texto} style={styles.part}>
                          <View style={[styles.dot, { backgroundColor: DOT[p.tipo] }]} />
                          <Text style={styles.partText}>{p.texto}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (palette: Palette) => {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.surface },
  content: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 120, gap: 16 },
  subtitle: { color: palette.secondaryText, fontSize: 13 },
  month: { color: palette.secondaryText, fontSize: 13, fontWeight: '700', textTransform: 'capitalize', marginBottom: 4 },

  centered: { paddingVertical: 40, gap: 6 },
  emptyTitle: { color: palette.text, fontSize: 18, fontWeight: '700' },
  emptyText: { color: palette.secondaryText, fontSize: 15, lineHeight: 21 },
  retry: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 8 },

  // One compact row per day: date on the left, that day's parts on the right.
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  date: { width: 40, alignItems: 'center' },
  dayNumber: { color: palette.text, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  weekday: { color: palette.secondaryText, fontSize: 12, textTransform: 'capitalize' },
  parts: { flex: 1, minWidth: 0, gap: 4, justifyContent: 'center' },
  part: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  partText: { flex: 1, color: palette.text, fontSize: 15, lineHeight: 21 },
});
};
