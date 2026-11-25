import React, { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Menu,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';

import type { Palette } from '@/constants/Colors';
import { useOnDataChange } from '@/lib/dataSync';
import { useThemed } from '@/lib/theme';
import { API_URL } from '@/constants/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useHideTabBarOnScroll } from '@/lib/tabBarVisibility';
import { Select } from '@/components/Select';
import { useAuth } from '@/lib/auth';
import { MONTHS, YEARS, longDate, parseDay } from '@/lib/dates';
import type { Asignation, AttendedValue } from '@/lib/types';

const today = new Date();
const CURRENT_MONTH = today.getMonth() + 1;
const CURRENT_YEAR = today.getFullYear();

// Status text colors are darker than the base palette so they stay readable on the surface.
const statusesFor = (p: Palette) =>
  ({
    success: { color: p.okText, label: 'Asistió' },
    danger: { color: p.badText, label: 'No asistió' },
    warning: { color: p.warnText, label: 'Pendiente' },
  }) as const;

const statusOf = (display: string | null | undefined, STATUS: ReturnType<typeof statusesFor>) => {
  if (display === 'ASISTIO') return STATUS.success;
  if (display === 'NO ASISTIO') return STATUS.danger;
  return STATUS.warning;
};

type TimerState = { accumulated: number; startedAt: number | null };

const elapsedOf = (t: TimerState | undefined, now: number) =>
  t ? t.accumulated + (t.startedAt ? Math.max(0, now - t.startedAt) : 0) : 0;

const formatElapsed = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

type SyncState = 'saving' | 'error' | undefined;

// Time display and start/pause for one assignment.
const TimerControl = React.memo(function TimerControl({
  elapsed,
  running,
  onToggle,
}: {
  elapsed: number;
  running: boolean;
  onToggle: () => void;
}) {
  const { palette, styles } = useThemed(makeStyles);
  return (
    <View style={styles.timer}>
      <Text style={[styles.timerText, running && styles.timerTextRunning]}>{formatElapsed(elapsed)}</Text>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={running ? 'Pausar cronómetro' : elapsed > 0 ? 'Reanudar cronómetro' : 'Iniciar cronómetro'}
        style={[styles.timerButton, running && styles.timerButtonRunning]}>
        <Ionicons
          name={running ? 'pause' : 'play'}
          size={20}
          color={running ? palette.onPrimary : palette.primary}
          style={running ? undefined : styles.playIcon}
        />
      </Pressable>
    </View>
  );
});

// Save-to-backend and reset actions, shown only once an assignment has a stopwatch.
function TimerActions({
  elapsed,
  saved,
  running,
  sync,
  onSync,
  onReset,
}: {
  elapsed: number;
  saved: number; // seconds already stored in the backend
  running: boolean;
  sync: SyncState;
  onSync: () => void;
  onReset: () => void;
}) {
  const { palette, styles } = useThemed(makeStyles);
  const STATUS = statusesFor(palette);
  const MUTED = palette.secondaryText;
  const seconds = Math.round(elapsed / 1000);
  const dirty = seconds !== saved;
  const canReset = !running && elapsed > 0;

  return (
    <View style={styles.timerActions}>
      {sync === 'saving' ? (
        <View style={styles.actionLink}>
          <ActivityIndicator size={14} color={palette.primary} />
          <Text style={styles.actionMuted}>Guardando…</Text>
        </View>
      ) : dirty ? (
        <Pressable
          onPress={onSync}
          accessibilityRole="button"
          accessibilityLabel={`Guardar tiempo ${formatElapsed(elapsed)}`}
          style={styles.actionLink}>
          <Ionicons name={sync === 'error' ? 'alert-circle' : 'cloud-upload-outline'} size={18} color={sync === 'error' ? STATUS.danger.color : palette.primary} />
          <Text style={[styles.actionText, sync === 'error' && { color: STATUS.danger.color }]}>
            {sync === 'error' ? 'No se pudo guardar. Reintentar' : 'Guardar tiempo'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.actionLink}>
          <Ionicons name="checkmark-circle" size={18} color={STATUS.success.color} />
          <Text style={[styles.actionMuted, { color: STATUS.success.color }]}>Tiempo guardado</Text>
        </View>
      )}
      {canReset && sync !== 'saving' && (
        <Pressable onPress={onReset} accessibilityRole="button" accessibilityLabel="Reiniciar cronómetro" style={styles.actionLink}>
          <Ionicons name="refresh" size={18} color={MUTED} />
          <Text style={styles.actionMuted}>Reiniciar</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { authFetch } = useAuth();
  const { palette, styles } = useThemed(makeStyles);
  const STATUS = statusesFor(palette);
  const scrollProps = useHideTabBarOnScroll();

  const [data, setData] = useState<Asignation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<Asignation | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editAttended, setEditAttended] = useState<AttendedValue>('pendiente');
  const [editMinutes, setEditMinutes] = useState('0');
  const [editSeconds, setEditSeconds] = useState('00');
  const [timeEdited, setTimeEdited] = useState(false);

  // Independent stopwatches keyed by assignment id; they keep running across month/filter changes.
  // An assignment without a local stopwatch shows (and continues from) its saved `tiempo`.
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  const [syncing, setSyncing] = useState<Record<number, SyncState>>({});
  const [now, setNow] = useState(() => Date.now());
  const anyRunning = useMemo(() => Object.values(timers).some((t) => t.startedAt !== null), [timers]);

  useEffect(() => {
    if (!anyRunning) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyRunning]);

  const timerFor = (item: Asignation): TimerState =>
    timers[item.id] ?? { accumulated: (item.tiempo ?? 0) * 1000, startedAt: null };

  const toggleTimer = (item: Asignation) =>
    setTimers((prev) => {
      const t = prev[item.id] ?? { accumulated: (item.tiempo ?? 0) * 1000, startedAt: null };
      const at = Date.now();
      return {
        ...prev,
        [item.id]: t.startedAt
          ? { accumulated: t.accumulated + (at - t.startedAt), startedAt: null }
          : { accumulated: t.accumulated, startedAt: at },
      };
    });

  const resetTimer = (id: number) =>
    setTimers((prev) => ({ ...prev, [id]: { accumulated: 0, startedAt: null } }));

  // Pauses the stopwatch and saves its time plus the assignment's current status and notes.
  const syncTimer = async (item: Asignation) => {
    const at = Date.now();
    const total = elapsedOf(timerFor(item), at);
    setTimers((prev) => ({ ...prev, [item.id]: { accumulated: total, startedAt: null } }));
    setNow(at);
    setSyncing((prev) => ({ ...prev, [item.id]: 'saving' }));

    try {
      const res = await authFetch(`/api/asignations-edit/${item.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiempo: Math.round(total / 1000),
          attended: item.attended ?? 'pendiente',
          notes: item.notes ?? '',
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const saved = (await res.json()) as Asignation;
      setData((prev) => prev.map((a) => (a.id === item.id ? { ...a, ...saved } : a)));
      setSyncing((prev) => ({ ...prev, [item.id]: undefined }));
    } catch {
      setSyncing((prev) => ({ ...prev, [item.id]: 'error' }));
    }
  };

  const showModal = (item?: Asignation) => {
    if (item) {
      setSelectedItem(item);
      setEditNotes(item.notes || '');
      setEditAttended(item.attended || 'pendiente');
      const total = Math.floor(elapsedOf(timerFor(item), Date.now()) / 1000);
      setEditMinutes(String(Math.floor(total / 60)));
      setEditSeconds(String(total % 60).padStart(2, '0'));
      setTimeEdited(false);
    }
    setVisible(true);
  };

  const hideModal = () => {
    setVisible(false);
    setSelectedItem(null);
  };

  // `silent`: background refresh (data changed on the server / re-sync): no spinner, and a failure keeps what is shown.
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);

    try {
      const res = await authFetch(`/api/asignations-by-month/?format=json&month=${month}&year=${year}`);
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
    loadData();
  }, [month, year]);
  useOnDataChange(() => loadData(true));

  const handlePatch = async () => {
    if (!selectedItem) return;

    // Only send the time if it was edited, so a running stopwatch isn't overwritten by a stale value.
    const tiempo = timeEdited
      ? Math.min(Number(editMinutes) || 0, 999) * 60 + Math.min(Number(editSeconds) || 0, 59)
      : undefined;

    try {
      await authFetch(`/api/asignations-edit/${selectedItem.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: editNotes,
          attended: editAttended,
          ...(tiempo !== undefined && { tiempo }),
        }),
      });
      if (tiempo !== undefined) {
        const id = selectedItem.id;
        setTimers((prev) => ({
          ...prev,
          [id]: { accumulated: tiempo * 1000, startedAt: prev[id]?.startedAt ? Date.now() : null },
        }));
      }
      hideModal();
      loadData();
    } catch {
      // Keep existing behavior: silently ignore errors in this patch workflow.
    }
  };

  const roomOptions = useMemo(
    () => Array.from(new Set(data.map((item) => item.room_display))),
    [data]
  );

  const dayOptions = useMemo(
    () => Array.from(new Set(data.map((item) => item.asignation_date))).sort(),
    [data]
  );

  // Filtered assignments grouped by meeting day, in program order.
  const groups = useMemo(() => {
    const filtered = data.filter((item) => {
      const roomMatches = selectedRoom ? item.room_display === selectedRoom : true;
      const dayMatches = selectedDay ? item.asignation_date === selectedDay : true;
      return roomMatches && dayMatches;
    });
    const byDay = new Map<string, Asignation[]>();
    filtered.forEach((item) => {
      byDay.set(item.asignation_date, [...(byDay.get(item.asignation_date) ?? []), item]);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        items: items.sort(
          (a, b) =>
            (a.asignation_number ?? 0) - (b.asignation_number ?? 0) ||
            a.room_display.localeCompare(b.room_display)
        ),
      }));
  }, [data, selectedDay, selectedRoom]);

  const monthLabel = MONTHS.find((m) => m.value === month)?.label || 'Mes';
  const hasFilters = !!(selectedRoom || selectedDay);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} {...scrollProps}>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={hideModal}
          style={styles.sheetWrapper}
          contentContainerStyle={styles.sheet}>
          {selectedItem && (
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{selectedItem.asignation_type.type_name}</Text>
              <Text style={styles.sheetSubtitle}>
                {longDate(selectedItem.asignation_date)}, {selectedItem.room_display}
              </Text>

              <View style={styles.detailBlock}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Persona</Text>
                  <Text style={styles.detailValue}>{selectedItem.person.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ayudante</Text>
                  <Text style={styles.detailValue}>
                    {selectedItem.helper ? selectedItem.helper.name : 'Sin ayudante'}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Asistencia</Text>
              <SegmentedButtons
                value={editAttended}
                onValueChange={(v) => setEditAttended(v as AttendedValue)}
                density="small"
                buttons={[
                  { value: 'pendiente', label: 'Pendiente' },
                  { value: 'Asistio', label: 'Asistió' },
                  { value: 'no asistio', label: 'No asistió' },
                ]}
              />

              <Text style={styles.fieldLabel}>Tiempo</Text>
              <View style={styles.timeRow}>
                <TextInput
                  value={editMinutes}
                  onChangeText={(v) => {
                    setEditMinutes(v.replace(/\D/g, '').slice(0, 3));
                    setTimeEdited(true);
                  }}
                  keyboardType="number-pad"
                  mode="outlined"
                  selectTextOnFocus
                  accessibilityLabel="Minutos"
                  right={<TextInput.Affix text="min" />}
                  style={styles.timeInput}
                  outlineStyle={styles.timeOutline}
                  outlineColor={palette.field}
                  activeOutlineColor={palette.primary}
                />
                <TextInput
                  value={editSeconds}
                  onChangeText={(v) => {
                    setEditSeconds(v.replace(/\D/g, '').slice(0, 2));
                    setTimeEdited(true);
                  }}
                  onBlur={() => setEditSeconds(String(Math.min(Number(editSeconds) || 0, 59)).padStart(2, '0'))}
                  keyboardType="number-pad"
                  mode="outlined"
                  selectTextOnFocus
                  accessibilityLabel="Segundos"
                  right={<TextInput.Affix text="s" />}
                  style={styles.timeInput}
                  outlineStyle={styles.timeOutline}
                  outlineColor={palette.field}
                  activeOutlineColor={palette.primary}
                />
              </View>

              <Text style={styles.fieldLabel}>Notas</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                numberOfLines={3}
                mode="outlined"
                style={styles.notesInput}
                outlineStyle={{ borderRadius: 10 }}
                outlineColor={palette.border}
                activeOutlineColor={palette.primary}
              />

              <View style={styles.sheetActions}>
                <Button mode="text" onPress={hideModal} textColor={palette.secondaryText}>
                  Cancelar
                </Button>
                <Button mode="contained" onPress={handlePatch} style={styles.saveButton}>
                  Guardar cambios
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>

      <ScreenHeader title="Asignaciones" />

      <View style={styles.form}>
        <View style={styles.formRow}>
          <Select
            style={styles.monthField}
            label="Mes"
            value={monthLabel}
            options={MONTHS.map((m) => ({
              key: String(m.value),
              label: m.label,
              selected: month === m.value,
              onSelect: () => {
                setMonth(m.value);
                setSelectedDay(null);
                setSelectedRoom(null);
              },
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

        <Select
          label="Sala"
          value={selectedRoom ?? 'Todas las salas'}
          disabled={roomOptions.length === 0}
          options={[
            { key: 'all', label: 'Todas las salas', selected: !selectedRoom, onSelect: () => setSelectedRoom(null) },
            ...roomOptions.map((room) => ({
              key: room,
              label: room,
              selected: selectedRoom === room,
              onSelect: () => setSelectedRoom(room),
            })),
          ]}
        />

        <Select
          label="Día"
          value={selectedDay ? longDate(selectedDay) : 'Todos los días'}
          disabled={dayOptions.length === 0}
          options={[
            { key: 'all', label: 'Todos los días', selected: !selectedDay, onSelect: () => setSelectedDay(null) },
            ...dayOptions.map((day) => ({
              key: day,
              label: longDate(day),
              selected: selectedDay === day,
              onSelect: () => setSelectedDay(day),
            })),
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator animating size="large" color={palette.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No hay conexión con el servidor</Text>
          <Text style={styles.emptyText}>
            Comprueba que el backend esté en marcha en {API_URL} y vuelve a intentarlo.
          </Text>
          <Button mode="outlined" onPress={() => loadData()} style={styles.retryButton}>
            Reintentar
          </Button>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {hasFilters ? 'Ninguna asignación coincide' : `Sin asignaciones en ${monthLabel.toLowerCase()} de ${year}`}
          </Text>
          <Text style={styles.emptyText}>
            {hasFilters
              ? 'Cambia la sala o el día para ver más asignaciones.'
              : 'Elige otro mes o año en los campos de arriba.'}
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.date} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{longDate(group.date)}</Text>
              <Text style={styles.dayCount}>
                {group.items.length} {group.items.length === 1 ? 'asignación' : 'asignaciones'}
              </Text>
            </View>

            {group.items.map((item, index) => {
              const status = statusOf(item.attended_display, STATUS);
              const timer = timerFor(item);
              const elapsed = elapsedOf(timer, now);
              const running = timer.startedAt !== null;
              const hasTimer = !!timers[item.id] || (item.tiempo ?? 0) > 0;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => showModal(item)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}>
                  <Text style={styles.rowNumber}>{item.asignation_number_display}</Text>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{item.asignation_type.type_name}</Text>
                    <Text style={styles.rowPerson}>
                      {item.person.name}
                      {item.helper ? <Text style={styles.rowHelper}> con {item.helper.name}</Text> : null}
                    </Text>
                    <View style={styles.statusLine}>
                      <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                      <Text style={styles.rowRoom}>{item.room_display}</Text>
                    </View>
                    {hasTimer && (
                      <TimerActions
                        elapsed={elapsed}
                        saved={item.tiempo ?? 0}
                        running={running}
                        sync={syncing[item.id]}
                        onSync={() => syncTimer(item)}
                        onReset={() => resetTimer(item.id)}
                      />
                    )}
                  </View>
                  <TimerControl elapsed={elapsed} running={running} onToggle={() => toggleTimer(item)} />
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (palette: Palette) => {
  const INK = palette.text;
  const MUTED = palette.secondaryText;
  const HAIRLINE = palette.border;
  return StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  pageContent: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 120, // clear the floating tab bar
    gap: 18,
  },
  title: {
    color: INK,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  // Form controls.
  form: {
    gap: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  monthField: {
    flex: 2,
  },
  yearField: {
    flex: 1,
  },
  loadingWrap: {
    paddingVertical: 48,
  },

  // One block per meeting day: full-width header, then the program rows.
  dayBlock: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: HAIRLINE,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: palette.fieldDisabled,
  },
  dayTitle: {
    flexShrink: 1,
    color: INK,
    fontSize: 16,
    fontWeight: '800',
  },
  dayCount: {
    color: MUTED,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: palette.surface,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HAIRLINE,
  },
  rowPressed: {
    backgroundColor: palette.fieldDisabled,
  },
  rowNumber: {
    width: 20,
    color: MUTED,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  rowPerson: {
    color: INK,
    fontSize: 14,
    lineHeight: 19,
  },
  rowHelper: {
    color: MUTED,
  },
  timer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timerText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timerTextRunning: {
    color: palette.primary,
  },
  timerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  timerButtonRunning: {
    backgroundColor: palette.primary,
  },
  timerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    marginTop: 2,
  },
  actionLink: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionMuted: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '500',
  },
  playIcon: {
    marginLeft: 2, // optical centering of the triangle
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowRoom: {
    color: MUTED,
    fontSize: 13,
    marginLeft: 6,
  },

  emptyWrap: {
    paddingVertical: 36,
    gap: 6,
  },
  emptyTitle: {
    color: INK,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 8,
  },

  // Edit sheet, anchored to the bottom of the screen.
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  sheetScroll: {
    maxHeight: 560,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 16,
    backgroundColor: palette.surface,
  },
  timeOutline: {
    borderRadius: 10,
  },
  sheetTitle: {
    color: INK,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    color: MUTED,
    fontSize: 14,
    marginTop: 2,
  },
  detailBlock: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  detailLabel: {
    color: MUTED,
  },
  detailValue: {
    color: INK,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: INK,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: palette.surface,
    minHeight: 80,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  saveButton: {
    borderRadius: 8,
  },
});
};
