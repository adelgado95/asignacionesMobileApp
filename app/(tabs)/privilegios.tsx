import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

type Person = { id: number; name: string };
type Programa = {
  id: number;
  fecha: string;
  dia: string;
  asistio?: Record<string, boolean | null>; // por privilegio: null pendiente, true asistió, false no asistió
  puede_marcar?: boolean; // anciano o siervo ministerial
  [key: string]: Person | string | number | boolean | Record<string, boolean | null> | null | undefined;
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

// Computed at call time (not at load) so a screen left open past midnight locks yesterday's meeting.
const isPast = (fecha: string) => {
  const d = new Date();
  return fecha < `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function PrivilegiosScreen() {
  const { authFetch } = useAuth();
  const { palette, styles } = useThemed(makeStyles);
  const scrollProps = useHideTabBarOnScroll();
  const [data, setData] = useState<Programa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  // `silent`: background refresh (data changed on the server / re-sync): no spinner, and a failure keeps what is shown.
  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const res = await authFetch(`/api/programa-privilegios/?format=json&month=${month}&year=${year}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      // Solo hoy y las reuniones futuras.
      setData(Array.isArray(json) ? json.filter((p: Programa) => p.fecha >= TODAY_ISO) : []);
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
    load();
  }, [month, year]);
  useOnDataChange(() => load(true));

  // Registra si la persona cumplió su privilegio (solo ancianos y siervos ministeriales: `puede_marcar`).
  // Es de un solo uso: pendiente -> asistió / no asistió; después los botones quedan desactivados
  // (corregirlo se hace en el admin de Django). Si falla, siguen disponibles.
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<{ id: string; msg: string } | null>(null);
  const markAsistio = async (p: Programa, key: string, value: boolean) => {
    const id = `${p.id}:${key}`;
    setSaving((s) => ({ ...s, [id]: true }));
    setFailed(null);
    try {
      const res = await authFetch(`/api/programa-privilegios/${p.id}/asistio/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privilegio: key, asistio: value }),
      });
      if (res.status === 403) throw new Error('Solo ancianos y siervos ministeriales pueden marcar la asistencia.');
      if (res.status === 409) throw new Error('La asistencia ya estaba registrada. Actualiza la pantalla.');
      if (!res.ok) throw new Error('No se pudo guardar. Inténtalo de nuevo.');
      setData((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, asistio: { ...(x.asistio ?? {}), [key]: value } } : x)),
      );
    } catch (e) {
      setFailed({ id, msg: e instanceof Error && e.message ? e.message : 'No se pudo guardar. Inténtalo de nuevo.' });
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  };

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
          <Button mode="outlined" onPress={() => load()} style={styles.retry}>
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
                  const id = `${p.id}:${it.key}`;
                  const state = p.asistio?.[it.key] ?? null; // null = pendiente
                  const locked = state !== null || !!saving[id] || isPast(p.fecha); // una sola vez; las pasadas no se marcan
                  return (
                    <View key={it.key}>
                      <View style={styles.row}>
                        <View style={styles.who}>
                          <Text style={styles.label}>{it.label}</Text>
                          <View style={styles.asistioSlot}>
                          {person && (
                          <>
                            {p.puede_marcar ? (
                              <View style={styles.asistio}>
                                <Pressable
                                  onPress={() => markAsistio(p, it.key, true)}
                                  disabled={locked}
                                  hitSlop={6}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Asistió: ${it.label}, ${person.name}`}
                                  accessibilityState={{ disabled: locked, selected: state === true }}
                                  style={[styles.mark, { borderColor: palette.success }, state === true && { backgroundColor: palette.success }, locked && state !== true && styles.markDim]}>
                                  <Ionicons name="checkmark" size={17} color={state === true ? palette.onPrimary : palette.success} />
                                </Pressable>
                                <Pressable
                                  onPress={() => markAsistio(p, it.key, false)}
                                  disabled={locked}
                                  hitSlop={6}
                                  accessibilityRole="button"
                                  accessibilityLabel={`No asistió: ${it.label}, ${person.name}`}
                                  accessibilityState={{ disabled: locked, selected: state === false }}
                                  style={[styles.mark, { borderColor: palette.danger }, state === false && { backgroundColor: palette.danger }, locked && state !== false && styles.markDim]}>
                                  <Ionicons name="close" size={17} color={state === false ? palette.onPrimary : palette.danger} />
                                </Pressable>
                              </View>
                            ) : (
                              <Text style={[styles.asistioText, state === true && { color: palette.okText }, state === false && { color: palette.badText }]}>
                                {state === true ? 'Asistió' : state === false ? 'No asistió' : 'Pendiente'}
                              </Text>
                            )}
                          </>
                      )}
                          </View>
                          <Text style={[styles.value, !person && styles.empty]}>{person?.name ?? '—'}</Text>
                        </View>
                      </View>
                      {failed?.id === id && <Text style={styles.failed}>{failed.msg}</Text>}
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

const makeStyles = (palette: Palette) => {
  const INK = palette.text;
  return StyleSheet.create({
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
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 96, color: palette.secondaryText, fontSize: 14 }, // fixed width: the buttons line up across rows
  value: { color: INK, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'right' },
  asistioSlot: { width: 72, justifyContent: 'center' }, // fixed width so the names line up across rows
  asistio: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  asistioText: { color: palette.secondaryText, fontSize: 12, fontWeight: '600' },
  mark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  markDim: { opacity: 0.3 },
  failed: { color: palette.badText, fontSize: 13, paddingBottom: 6 },
  empty: { color: palette.tabIconDefault, fontWeight: '400' },
});
};
