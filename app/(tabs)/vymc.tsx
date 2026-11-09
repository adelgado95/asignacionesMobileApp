import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { Select } from '@/components/Select';
import { Colors } from '@/constants/Colors';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/lib/auth';
import { MONTHS, YEARS, longDate } from '@/lib/dates';

const palette = Colors.light;

const SECTION = {
  tesoros: '#575A5D',
  maestros: '#BE8900',
  vida: '#7E0024',
  acomodadores: '#3D5A6C',
} as const;

const CONGREGATION = 'AVENIDA CENTRAL LEÓN';
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

// ---------- API shape (GET /api/vymc/) ----------

type ApiParte = {
  numero: number;
  seccion: 'tesoros' | 'maestros' | 'vida';
  titulo: string;
  minutos: number | null;
  principal: string | null;
  auxiliar: string | null;
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
  estudio_biblico: { numero: number; titulo: string; minutos: number; conductor: string | null; lector: string | null };
  acomodadores: ApiAcomodadores[];
};

// ---------- Program model (what the screen draws) ----------

type Line = { label?: string; value: string };
type Row = { kind: 'bullet' | 'part'; text: string; lines: Line[] };
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

const parteRow = (p: ApiParte): Row => ({
  kind: 'part',
  text: `${p.numero}. ${p.titulo || 'Por asignar'}${p.minutos ? ` (${p.minutos} mins.)` : ''}`,
  lines: [
    { value: dash(p.principal) },
    ...(p.auxiliar ? [{ label: 'Sala auxiliar', value: p.auxiliar }] : []),
  ],
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
  const parts = (s: ApiParte['seccion']) => w.partes.filter((p) => p.seccion === s).map(parteRow);
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

const today = new Date();
const TODAY_ISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

// ---------- Components ----------

// "Etiqueta  Valor" line: small gray label followed by the name.
function InfoLine({ label, value }: { label?: string; value: string }) {
  return (
    <Text style={styles.infoLine}>
      {label ? <Text style={styles.infoLabel}>{label}  </Text> : null}
      {value}
    </Text>
  );
}

function SectionBar({ title, color }: { title: string; color: string }) {
  return (
    <View style={[styles.sectionBar, { backgroundColor: color }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function RowView({ row, color, first }: { row: Row; color: string; first: boolean }) {
  return (
    <View style={[styles.row, !first && styles.rowDivider]}>
      <Text style={styles.rowTitle}>
        {row.kind === 'bullet' ? <Text style={{ color }}>●  </Text> : null}
        {row.text}
      </Text>
      {row.lines.map((l, i) => (
        <InfoLine key={i} label={l.label} value={l.value} />
      ))}
    </View>
  );
}

export default function VyMCScreen() {
  const { authFetch } = useAuth();
  const [weeks, setWeeks] = useState<ApiWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(`/api/vymc/?format=json&month=${month}&year=${year}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setWeeks(Array.isArray(json) ? json : []);
    } catch {
      setWeeks([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, year]);

  // Default to the current week (or the next one, or the last of the month).
  useEffect(() => {
    if (weeks.length === 0) setSelectedId(null);
    else if (selectedId === null || !weeks.some((w) => w.id === selectedId)) {
      setSelectedId((weeks.find((w) => w.fecha_fin >= TODAY_ISO) ?? weeks[weeks.length - 1]).id);
    }
  }, [weeks]);

  const selected = weeks.find((w) => w.id === selectedId) ?? null;
  const program = useMemo(() => (selected ? toProgram(selected) : null), [selected]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <View style={styles.formRow}>
          <Select
            style={styles.monthField}
            label="Mes"
            value={MONTHS[month - 1].label}
            options={MONTHS.map((m) => ({
              key: String(m.value),
              label: m.label,
              selected: month === m.value,
              onSelect: () => {
                setSelectedId(null);
                setMonth(m.value);
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
              onSelect: () => {
                setSelectedId(null);
                setYear(y);
              },
            }))}
          />
        </View>
        <Select
          label="Semana"
          value={selected ? selected.semana : 'Sin semanas'}
          disabled={weeks.length === 0}
          options={weeks.map((w) => ({
            key: String(w.id),
            label: w.semana,
            selected: selectedId === w.id,
            onSelect: () => setSelectedId(w.id),
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
      ) : !program ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>
            Sin programa en {MONTHS[month - 1].label.toLowerCase()} de {year}
          </Text>
          <Text style={styles.emptyText}>Las semanas se agregan desde el administrador de Django.</Text>
        </View>
      ) : (
        <View style={styles.sheet}>
          <Text style={styles.congregation}>{CONGREGATION}</Text>
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
                <RowView key={j} row={row} color={section.color} first={j === 0} />
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
    </ScrollView>
  );
}

const INK = palette.text;
const GRAY = '#7B7D7F';

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.surface },
  content: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 120, // clear the floating tab bar
    gap: 18,
  },
  form: { gap: 14 },
  formRow: { flexDirection: 'row', gap: 12 },
  monthField: { flex: 2 },
  yearField: { flex: 1 },
  centered: { paddingVertical: 40, gap: 6 },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: '700' },
  emptyText: { color: palette.secondaryText, fontSize: 15, lineHeight: 21 },
  dayBlock: { paddingTop: 12, gap: 4 },
  dayTitle: { color: INK, fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  retry: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 8 },

  // The program sheet: one column, every row full width.
  sheet: { gap: 14 },
  congregation: { color: INK, fontSize: 13, fontWeight: '800' },
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
  rowTitle: { color: INK, fontSize: 15, lineHeight: 21 },
  infoLine: { color: INK, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  infoLabel: { color: GRAY, fontSize: 13, fontWeight: '600' },
});
