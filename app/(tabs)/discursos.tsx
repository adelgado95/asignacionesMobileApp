import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useHideTabBarOnScroll } from '@/lib/tabBarVisibility';
import { Select } from '@/components/Select';
import type { Palette } from '@/constants/Colors';
import { useOnDataChange } from '@/lib/dataSync';
import { useThemed } from '@/lib/theme';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/lib/auth';
import { MONTHS, YEARS, longDate } from '@/lib/dates';

type Discurso = {
  id: number;
  titulo: string;
  nombre: string;
  congregacion: string;
  fecha: string;
  contacto: string;
  cancion: number | null;
};

const today = new Date();
const TODAY_ISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

// Discursos públicos del mes (los pasados siguen visibles); la pantalla se desplaza al de hoy o al más próximo.
export default function DiscursosScreen() {
  const { authFetch } = useAuth();
  const { palette, styles } = useThemed(makeStyles);
  const scrollProps = useHideTabBarOnScroll();
  const scrollRef = useRef<ScrollView>(null);
  const scrolledFor = useRef('');
  const nextY = useRef<number | null>(null); // posición de la tarjeta de hoy / próxima
  const [data, setData] = useState<Discurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  // `silent`: recarga en segundo plano: sin spinner, y si falla se conserva lo mostrado.
  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const res = await authFetch(`/api/discursos-publicos/?format=json&month=${month}&year=${year}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      if (!silent) {
        setData([]);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrolledFor.current = '';
    nextY.current = null;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    load();
  }, [month, year]);
  useOnDataChange(() => load(true));

  // Cada vez que se entra a la pestaña, se vuelve a la reunión de hoy o la próxima (las pestañas siguen montadas).
  useFocusEffect(
    useCallback(() => {
      if (nextY.current !== null) scrollRef.current?.scrollTo({ y: nextY.current, animated: false });
    }, []),
  );

  const nextId = data.find((d) => d.fecha >= TODAY_ISO)?.id;

  return (
    <ScrollView ref={scrollRef} style={styles.page} contentContainerStyle={styles.content} {...scrollProps}>
      <ScreenHeader title="Discursos públicos" />

      <View style={styles.formRow}>
        <Select
          compact
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
          compact
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
          <Button mode="outlined" onPress={() => load()} style={styles.retry}>
            Reintentar
          </Button>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>
            Sin discursos en {MONTHS[month - 1].label.toLowerCase()} de {year}
          </Text>
          <Text style={styles.emptyText}>Prueba con otro mes.</Text>
        </View>
      ) : (
        data.map((d) => (
          <View
            key={d.id}
            style={[styles.card, d.id === nextId && styles.cardNext]}
            onLayout={(e) => {
              // Al cargar el mes/año: desplaza al discurso de hoy o al próximo (los pasados quedan arriba).
              if (d.id !== nextId) return;
              const y = Math.max(0, e.nativeEvent.layout.y - 12);
              nextY.current = y; // para volver aquí al entrar de nuevo a la pestaña
              const key = `${month}-${year}`;
              if (scrolledFor.current === key) return;
              scrolledFor.current = key;
              scrollRef.current?.scrollTo({ y, animated: false });
            }}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{longDate(d.fecha)}</Text>
              {d.id === nextId && <Text style={styles.nextTag}>Próximo</Text>}
            </View>
            <Row styles={styles} label="Título" value={d.titulo} />
            <Row styles={styles} label="Nombre" value={d.nombre} />
            <Row styles={styles} label="Congregación" value={d.congregacion} />
            <Row styles={styles} label="Contacto" value={d.contacto} />
            <Row styles={styles} label="Canción" value={d.cancion ? String(d.cancion) : ''} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Row({ styles, label, value }: { styles: ReturnType<typeof makeStyles>; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !value && styles.empty]}>{value || '—'}</Text>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 120, gap: 16 },
    formRow: { flexDirection: 'row', gap: 12 },
    monthField: { flex: 1.4 },
    yearField: { flex: 1 },

    centered: { paddingVertical: 40, gap: 6 },
    emptyTitle: { color: palette.text, fontSize: 18, fontWeight: '700' },
    emptyText: { color: palette.secondaryText, fontSize: 15, lineHeight: 21 },
    retry: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 8 },

    card: {
      backgroundColor: palette.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 16,
      gap: 4,
    },
    cardNext: { borderColor: palette.primary, borderWidth: 2 },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
    cardTitle: { color: palette.text, fontSize: 18, fontWeight: '800', textTransform: 'capitalize', flexShrink: 1 },
    nextTag: { color: palette.primary, fontSize: 13, fontWeight: '700' },

    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      minHeight: 40,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
    },
    label: { width: 110, color: palette.secondaryText, fontSize: 14 },
    value: { color: palette.text, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'right' },
    empty: { color: palette.tabIconDefault, fontWeight: '400' },
  });
