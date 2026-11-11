import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { WeekHeader } from '@/components/WeekHeader';
import { useHideTabBarOnScroll } from '@/lib/tabBarVisibility';
import type { Palette } from '@/constants/Colors';
import { useOnDataChange } from '@/lib/dataSync';
import { useThemed } from '@/lib/theme';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/lib/auth';
import { TimerActions, TimerControl, elapsedOf, useStopwatches } from '@/components/Stopwatch';
import { longDate } from '@/lib/dates';
import { formatWeekRange, getWeekStart, monthOfWeek, toISODate } from '@/lib/weeks';


const SECTION = {
  tesoros: '#575A5D',
  maestros: '#BE8900',
  vida: '#7E0024',
  acomodadores: '#3D5A6C',
} as const;

const CONGREGATION = 'Avenida Central León';
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

// ---------- API shape (GET /api/vymc/) ----------

type ApiParte = {
  numero: number;
  seccion: 'tesoros' | 'maestros' | 'vida';
  titulo: string;
  minutos: number | null;
  principal: string | null;
  auxiliar: string | null;
  tiempo: number | null; // real duration in seconds
};

type ApiAcomodadores = {
  fecha: string;
  dia: string;
  presidente: string | null;
  oracion_inicio: string | null;
  oracion_final: string | null;
  lector: string | null;
  entrada: string | null;
  auditorio: string | null;
  microfono1: string | null;
  microfono2: string | null;
  plataforma: string | null;
  audio: string | null;
};

type ApiWeek = {
  id: number;
  semana: string; // "Semana 9 – 15 de noviembre"
  fecha_inicio: string;
  fecha_fin: string;
  lectura_semanal: string;
  presidente: string | null;
  consejero: string | null;
  cancion_inicial: number | null;
  cancion_intermedia: number | null;
  cancion_final: number | null;
  oracion_inicial: string | null;
  oracion_final: string | null;
  partes: ApiParte[];
  estudio_biblico: { numero: number; titulo: string; minutos: number; conductor: string | null; lector: string | null; tiempo: number | null };
  acomodadores: ApiAcomodadores[];
};

// ---------- Program model (what the screen draws) ----------

type Line = { label?: string; value: string };
type RowTimer = { weekId: number; numero: number; saved: number; limit: number | null };
type Row = { kind: 'bullet' | 'part'; text: string; lines: Line[]; timer?: RowTimer };
type Section = { title?: string; color: string; rows: Row[] };
type Program = {
  week: string;
  scripture: string;
  roles: Line[];
  sections: Section[];
  acomodadores: { title: string; items: Line[] }[];
};

const dash = (v?: string | null) => v || '—';
const song = (n: number | null) => (n ? `Canción ${n}` : 'Canción');

const parteRow = (weekId: number) => (p: ApiParte): Row => ({
  kind: 'part',
  text: `${p.numero}. ${p.titulo || 'Por asignar'}${p.minutos ? ` (${p.minutos} mins.)` : ''}`,
  lines: [
    { value: dash(p.principal) },
    ...(p.auxiliar ? [{ label: 'Sala auxiliar', value: p.auxiliar }] : []),
  ],
  timer: { weekId, numero: p.numero, saved: p.tiempo ?? 0, limit: p.minutos },
});

const ACOMODADOR_FIELDS: { key: keyof ApiAcomodadores; label: string }[] = [
  { key: 'presidente', label: 'Presidente' },
  { key: 'oracion_inicio', label: 'Oración inicial' },
  { key: 'oracion_final', label: 'Oración final' },
  { key: 'lector', label: 'Lector' },
  { key: 'entrada', label: 'Entrada' },
  { key: 'auditorio', label: 'Auditorio' },
  { key: 'microfono1', label: 'Micrófono 1' },
  { key: 'microfono2', label: 'Micrófono 2' },
  { key: 'plataforma', label: 'Plataforma' },
  { key: 'audio', label: 'Audio' },
];

function toProgram(w: ApiWeek): Program {
  const parts = (s: ApiParte['seccion']) => w.partes.filter((p) => p.seccion === s).map(parteRow(w.id));
  const e = w.estudio_biblico;
  const sections: Section[] = [
    {
      color: SECTION.tesoros,
      rows: [
        {
          kind: 'bullet',
          text: song(w.cancion_inicial),
          lines: [{ label: 'Oración', value: dash(w.oracion_inicial) }],
        },
        { kind: 'bullet', text: 'Palabras de introducción (1 min.)', lines: [] },
      ],
    },
    { title: 'TESOROS DE LA BIBLIA', color: SECTION.tesoros, rows: parts('tesoros') },
    { title: 'SEAMOS MEJORES MAESTROS', color: SECTION.maestros, rows: parts('maestros') },
    {
      title: 'NUESTRA VIDA CRISTIANA',
      color: SECTION.vida,
      rows: [
        { kind: 'bullet', text: song(w.cancion_intermedia), lines: [] },
        ...parts('vida'),
        {
          kind: 'part',
          text: `${e.numero}. ${e.titulo} (${e.minutos} mins.)`,
          lines: [
            { label: 'Conductor', value: dash(e.conductor) },
            { label: 'Lector', value: dash(e.lector) },
          ],
          timer: { weekId: w.id, numero: e.numero, saved: e.tiempo ?? 0, limit: e.minutos },
        },
        { kind: 'bullet', text: 'Palabras de conclusión (3 min.)', lines: [] },
        {
          kind: 'bullet',
          text: song(w.cancion_final),
          lines: [{ label: 'Oración', value: dash(w.oracion_final) }],
        },
      ],
    },
  ];
  return {
    week: w.semana,
    scripture: w.lectura_semanal,
    roles: [
      { label: 'Presidente', value: dash(w.presidente) },
      { label: 'Consejero de la sala auxiliar', value: dash(w.consejero) },
    ],
    sections: sections.filter((s) => s.rows.length > 0),
    acomodadores: w.acomodadores.map((a) => ({
      title: longDate(a.fecha),
      items: ACOMODADOR_FIELDS.map((f) => ({ label: f.label, value: dash(a[f.key] as string | null) })),
    })),
  };
}


// ---------- Components ----------

// "Etiqueta  Valor" line: small gray label followed by the name.
function InfoLine({ label, value }: { label?: string; value: string }) {
  const { styles } = useThemed(makeStyles);
  return (
    <Text style={styles.infoLine}>
      {label ? <Text style={styles.infoLabel}>{label}  </Text> : null}
      {value}
    </Text>
  );
}

function SectionBar({ title, color }: { title: string; color: string }) {
  const { styles } = useThemed(makeStyles);
  return (
    <View style={[styles.sectionBar, { backgroundColor: color }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function RowView({
  row,
  color,
  first,
  control,
  actions,
}: {
  row: Row;
  color: string;
  first: boolean;
  control?: React.ReactNode; // stopwatch, on the same line as the title
  actions?: React.ReactNode; // save status, below
}) {
  const { styles } = useThemed(makeStyles);
  return (
    <View style={[styles.row, !first && styles.rowDivider]}>
      <View style={styles.rowTop}>
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>
            {row.kind === 'bullet' ? <Text style={{ color }}>●  </Text> : null}
            {row.text}
          </Text>
          {row.lines.map((l, i) => (
            <InfoLine key={i} label={l.label} value={l.value} />
          ))}
        </View>
        {control}
      </View>
      {actions}
    </View>
  );
}

export default function VyMCScreen() {
  const { palette, styles } = useThemed(makeStyles);
  const { authFetch, signOut } = useAuth();
  const scrollProps = useHideTabBarOnScroll();
  const [weeks, setWeeks] = useState<ApiWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Monday of the selected week; the month and year loaded from the API come from it.
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const { month, year } = monthOfWeek(weekStart);
  const sw = useStopwatches();

  // `silent`: background refresh (data changed on the server / re-sync): no spinner, and a failure keeps what is shown.
  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const res = await authFetch(`/api/vymc/?format=json&month=${month}&year=${year}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setWeeks(Array.isArray(json) ? json : []);
    } catch {
      if (!silent) {
        setWeeks([]);
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

  const keyOf = (t: RowTimer) => `${t.weekId}:${t.numero}`;

  // Pauses the stopwatch and stores its time for that part (the study is saved on the week).
  const syncPart = async (t: RowTimer) => {
    const key = keyOf(t);
    const seconds = sw.freeze(key, t.saved);
    sw.setSync(key, 'saving');
    try {
      const res = await authFetch(`/api/vymc/${t.weekId}/tiempo/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: t.numero, tiempo: seconds }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setWeeks((prev) =>
        prev.map((w) =>
          w.id !== t.weekId
            ? w
            : w.estudio_biblico.numero === t.numero
              ? { ...w, estudio_biblico: { ...w.estudio_biblico, tiempo: seconds } }
              : { ...w, partes: w.partes.map((p) => (p.numero === t.numero ? { ...p, tiempo: seconds } : p)) },
        ),
      );
      sw.setSync(key, undefined);
      sw.flashSaved(key);
    } catch {
      sw.setSync(key, 'error');
    }
  };

  const timerParts = (t: RowTimer) => {
    const key = keyOf(t);
    const timer = sw.timerFor(key, t.saved);
    const elapsed = elapsedOf(timer, sw.now);
    const running = timer.startedAt !== null;
    // Actions appear only once this stopwatch has been used; a time loaded from the backend shows just the clock.
    const started = !!sw.timers[key];
    return {
      control: (
        <TimerControl
          inline
          elapsed={elapsed}
          running={running}
          over={t.limit ? elapsed > t.limit * 60000 : false}
          // Time already stored in the backend (loaded, or just autosaved from this session): shown, but locked.
          // It stays enabled while running (to pause) and while there is unsaved time (resuming cancels the autosave,
          // and after a failed save the user can still continue). Fix times in Django admin.
          disabled={
            !running &&
            t.saved > 0 &&
            sw.syncing[key] !== 'error' &&
            (sw.syncing[key] === 'saving' || Math.round(elapsed / 1000) === t.saved)
          }
          onToggle={() => {
            sw.setSync(key, undefined);
            sw.hideSaved(key);
            sw.toggle(key, t.saved);
          }}
        />
      ),
      actions: started ? (
        <TimerActions
          elapsed={elapsed}
          saved={t.saved}
          running={running}
          sync={sw.syncing[key]}
          justSaved={!!sw.flash[key]}
          onSync={() => syncPart(t)}
          onReset={() => sw.reset(key, t.saved)}
        />
      ) : undefined,
    };
  };

  // Autosave: 3 s after a stopwatch is paused with unsaved time, store it. Resuming within that time cancels it.
  const syncPartRef = useRef(syncPart);
  syncPartRef.current = syncPart;
  const pending = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const allTimers = useMemo<RowTimer[]>(
    () =>
      weeks.flatMap((w) => [
        ...w.partes.map((p) => ({ weekId: w.id, numero: p.numero, saved: p.tiempo ?? 0, limit: p.minutos })),
        { weekId: w.id, numero: w.estudio_biblico.numero, saved: w.estudio_biblico.tiempo ?? 0, limit: w.estudio_biblico.minutos },
      ]),
    [weeks],
  );

  useEffect(() => {
    for (const t of allTimers) {
      const key = keyOf(t);
      const timer = sw.timers[key];
      const waiting =
        !!timer &&
        timer.startedAt === null &&
        Math.round(timer.accumulated / 1000) !== t.saved &&
        sw.syncing[key] === undefined; // after an error the user retries by hand
      if (waiting && !pending.current[key]) {
        pending.current[key] = setTimeout(() => {
          delete pending.current[key];
          syncPartRef.current(t);
        }, 3000);
      } else if (!waiting && pending.current[key]) {
        clearTimeout(pending.current[key]);
        delete pending.current[key];
      }
    }
  }, [allTimers, sw.timers, sw.syncing]);

  useEffect(() => () => Object.values(pending.current).forEach(clearTimeout), []);

  // The program of the selected week, if the backend has one.
  const weekIso = toISODate(weekStart);
  const selected = weeks.find((w) => w.fecha_inicio === weekIso) ?? null;
  const program = useMemo(() => (selected ? toProgram(selected) : null), [selected]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} {...scrollProps}>
      <WeekHeader value={weekStart} onChange={setWeekStart} onLogout={signOut} congregation={CONGREGATION} />

      <View style={styles.body}>
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
      ) : !program ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Sin programa del {formatWeekRange(weekStart)}</Text>
          <Text style={styles.emptyText}>Las semanas se agregan desde el administrador de Django.</Text>
        </View>
      ) : (
        <View style={styles.sheet}>
          <Text style={styles.programTitle}>Programa para la reunión de entre semana</Text>
          <View style={styles.weekBlock}>
            <Text style={styles.week}>{program.week.toUpperCase()}</Text>
            {program.scripture ? (
              <Text style={styles.scripture}>LECTURA SEMANAL DE LA BIBLIA {program.scripture}</Text>
            ) : null}
          </View>

          <View style={styles.roles}>
            {program.roles.map((r, i) => (
              <View key={r.label} style={[styles.roleRow, i > 0 && styles.rowDivider]}>
                <Text style={styles.roleLabel}>{r.label}</Text>
                <Text style={styles.roleValue}>{r.value}</Text>
              </View>
            ))}
          </View>

          {program.sections.map((section, i) => (
            <View key={i}>
              {section.title && <SectionBar title={section.title} color={section.color} />}
              {section.rows.map((row, j) => (
                <RowView key={j} row={row} color={section.color} first={j === 0} {...(row.timer ? timerParts(row.timer) : {})} />
              ))}
            </View>
          ))}

          {program.acomodadores.length > 0 && (
            <View>
              <SectionBar title="ACOMODADORES" color={SECTION.acomodadores} />
              {program.acomodadores.map((day) => (
                <View key={day.title} style={styles.dayBlock}>
                  <Text style={styles.dayTitle}>{day.title}</Text>
                  <View style={styles.roles}>
                    {day.items.map((r, i) => (
                      <View key={r.label} style={[styles.roleRow, i > 0 && styles.rowDivider]}>
                        <Text style={styles.roleLabel}>{r.label}</Text>
                        <Text style={styles.roleValue}>{r.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (palette: Palette) => {
  const INK = palette.text;
  const GRAY = palette.gray;
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.surface },
  content: {
    paddingBottom: 120, // clear the floating tab bar
  },
  body: { paddingHorizontal: 20, gap: 18 },
  centered: { paddingVertical: 40, gap: 6 },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: '700' },
  emptyText: { color: palette.secondaryText, fontSize: 15, lineHeight: 21 },
  dayBlock: { paddingTop: 12, gap: 4 },
  dayTitle: { color: INK, fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  retry: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 8 },

  // The program sheet: one column, every row full width.
  sheet: { gap: 14 },
  programTitle: {
    color: INK,
    fontFamily: SERIF,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  weekBlock: { gap: 2 },
  week: { color: INK, fontSize: 15, fontWeight: '800' },
  scripture: { color: palette.secondaryText, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  roles: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
    paddingVertical: 8,
  },
  roleLabel: { flexShrink: 1, color: GRAY, fontSize: 14, fontWeight: '600' },
  roleValue: { flexShrink: 1, color: INK, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  sectionBar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 2,
    gap: 3,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  rowMain: { flex: 1, gap: 3 },
  rowTitle: { color: INK, fontSize: 15, lineHeight: 21 },
  infoLine: { color: INK, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  infoLabel: { color: GRAY, fontSize: 13, fontWeight: '600' },
});
};
