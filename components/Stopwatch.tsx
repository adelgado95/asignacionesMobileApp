import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import type { Palette } from '@/constants/Colors';
import { useThemed } from '@/lib/theme';


export type TimerState = { accumulated: number; startedAt: number | null };
export type SyncState = 'saving' | 'error' | undefined;

export const elapsedOf = (t: TimerState | undefined, now: number) =>
  t ? t.accumulated + (t.startedAt ? Math.max(0, now - t.startedAt) : 0) : 0;

export const formatElapsed = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// Time display and start/pause for one stopwatch. `over` turns the time red (past the allotted time).
export const TimerControl = React.memo(function TimerControl({
  elapsed,
  running,
  over,
  inline,
  disabled,
  onToggle,
}: {
  elapsed: number;
  running: boolean;
  over?: boolean;
  inline?: boolean; // time and button side by side, to sit on the same line as a title
  disabled?: boolean; // time already recorded: shown, but it cannot be restarted
  onToggle: () => void;
}) {
  const { palette, styles } = useThemed(makeStyles);
  const BAD = palette.badText;
  return (
    <View style={inline ? styles.timerInline : styles.timer}>
      <Text style={[styles.timerText, running && styles.timerTextRunning, over && { color: BAD }]}>
        {formatElapsed(elapsed)}
      </Text>
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        accessibilityLabel={running ? 'Pausar cronómetro' : elapsed > 0 ? 'Reanudar cronómetro' : 'Iniciar cronómetro'}
        style={[styles.timerButton, running && styles.timerButtonRunning, disabled && styles.actionDisabled]}>
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

// Feedback for a stopwatch that has been used. Saving is automatic (the screen saves 3 s after pausing):
// "Reiniciar" is the short undo for an accidental press and only exists during that wait, and
// "Tiempo guardado" is shown briefly after the save. Outside those moments nothing is rendered.
export function TimerActions({
  elapsed,
  saved,
  running,
  sync,
  justSaved,
  onSync,
  onReset,
}: {
  elapsed: number;
  saved: number; // seconds already stored in the backend
  running: boolean;
  sync: SyncState;
  justSaved: boolean;
  onSync: () => void; // retry after an error
  onReset: () => void; // discards this session's time, back to the saved value
}) {
  const { palette, styles } = useThemed(makeStyles);
  const BAD = palette.badText;
  const OK = palette.okText;
  const canReset = !running && Math.round(elapsed / 1000) !== saved && sync === undefined;

  return (
    <View style={styles.timerActions}>
      {sync === 'saving' ? (
        <View style={styles.actionLink}>
          <ActivityIndicator size={14} color={palette.primary} />
          <Text style={styles.actionMuted}>Guardando…</Text>
        </View>
      ) : sync === 'error' ? (
        <Pressable
          onPress={onSync}
          accessibilityRole="button"
          accessibilityLabel={`Reintentar guardar tiempo ${formatElapsed(elapsed)}`}
          style={styles.actionLink}>
          <Ionicons name="alert-circle" size={18} color={BAD} />
          <Text style={[styles.actionText, { color: BAD }]}>No se pudo guardar. Reintentar</Text>
        </Pressable>
      ) : justSaved && !running ? (
        <View style={styles.actionLink}>
          <Ionicons name="checkmark-circle" size={18} color={OK} />
          <Text style={[styles.actionMuted, { color: OK }]}>Tiempo guardado</Text>
        </View>
      ) : null}
      {canReset && (
        <Pressable onPress={onReset} accessibilityRole="button" accessibilityLabel="Reiniciar cronómetro" style={styles.actionLink}>
          <Ionicons name="refresh" size={18} color={palette.primary} />
          <Text style={styles.actionText}>Reiniciar</Text>
        </Pressable>
      )}
    </View>
  );
}

// Independent stopwatches by key, sharing one 1s interval that only runs while one is active.
// A key without a local stopwatch shows (and continues from) its saved seconds.
export function useStopwatches() {
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const [syncing, setSyncing] = useState<Record<string, SyncState>>({});
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [now, setNow] = useState(() => Date.now());
  const anyRunning = useMemo(() => Object.values(timers).some((t) => t.startedAt !== null), [timers]);

  useEffect(() => {
    if (!anyRunning) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyRunning]);

  const timerFor = (key: string, saved: number): TimerState =>
    timers[key] ?? { accumulated: saved * 1000, startedAt: null };

  const toggle = (key: string, saved: number) =>
    setTimers((prev) => {
      const t = prev[key] ?? { accumulated: saved * 1000, startedAt: null };
      const at = Date.now();
      return {
        ...prev,
        [key]: t.startedAt
          ? { accumulated: t.accumulated + (at - t.startedAt), startedAt: null }
          : { accumulated: t.accumulated, startedAt: at },
      };
    });

  // Pauses the stopwatch and returns its total in whole seconds.
  const freeze = (key: string, saved: number) => {
    const at = Date.now();
    const total = elapsedOf(timerFor(key, saved), at);
    setTimers((prev) => ({ ...prev, [key]: { accumulated: total, startedAt: null } }));
    setNow(at);
    return Math.round(total / 1000);
  };

  // Drops the time of the current session and goes back to the saved value.
  const reset = (key: string, saved: number) =>
    setTimers((prev) => ({ ...prev, [key]: { accumulated: saved * 1000, startedAt: null } }));

  // Shows the "saved" confirmation for 2 seconds.
  const flashSaved = (key: string) => {
    clearTimeout(flashTimers.current[key]);
    setFlash((prev) => ({ ...prev, [key]: true }));
    flashTimers.current[key] = setTimeout(() => setFlash((prev) => ({ ...prev, [key]: false })), 2000);
  };
  const hideSaved = (key: string) => {
    clearTimeout(flashTimers.current[key]);
    setFlash((prev) => ({ ...prev, [key]: false }));
  };
  useEffect(() => () => Object.values(flashTimers.current).forEach(clearTimeout), []);

  const setSync = (key: string, state: SyncState) => setSyncing((prev) => ({ ...prev, [key]: state }));

  return { now, timers, syncing, flash, timerFor, toggle, reset, freeze, setSync, flashSaved, hideSaved };
}

const makeStyles = (palette: Palette) => {
  const MUTED = palette.secondaryText;
  return StyleSheet.create({
  timer: { alignItems: 'flex-end', gap: 4 },
  timerInline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerText: { color: MUTED, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timerTextRunning: { color: palette.primary },
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
  timerButtonRunning: { backgroundColor: palette.primary },
  timerActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, marginTop: 2 },
  actionLink: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: palette.primary, fontSize: 14, fontWeight: '600' },
  actionMuted: { color: MUTED, fontSize: 14, fontWeight: '500' },
  actionDisabled: { opacity: 0.45 },
  playIcon: { marginLeft: 2 }, // optical centering of the triangle
});
};
