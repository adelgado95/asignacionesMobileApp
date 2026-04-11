import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { Colors } from '@/constants/Colors';

const palette = Colors.light;

const quickFacts = [
  {
    title: 'Seguimiento centralizado',
    detail: 'Todas las asignaciones del mes en un solo lugar para consultas rapidas.',
  },
  {
    title: 'Filtros operativos',
    detail: 'Segmenta por sala y dia para trabajar con una vista mas precisa.',
  },
  {
    title: 'Actualizacion inmediata',
    detail: 'Edita estado y notas desde el detalle sin salir del flujo principal.',
  },
];

export default function ExploreScreen() {
  return (
    <View style={styles.page}>
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />

      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Asistencias</Text>
        <Text style={styles.heroTitle}>Resumen operativo</Text>
        <Text style={styles.heroSubtitle}>
          Este modulo esta enfocado en consistencia de datos, rapidez de gestion y mejor visibilidad
          del estado de cada asignacion.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Puntos clave</Text>
        {quickFacts.map((fact, index) => (
          <View key={fact.title} style={styles.itemRow}>
            <Text style={styles.itemIndex}>{`0${index + 1}`}</Text>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{fact.title}</Text>
              <Text style={styles.itemDetail}>{fact.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Buenas practicas recomendadas</Text>
        <Divider style={styles.divider} />
        <Text style={styles.tipText}>1. Revisar pendientes al inicio de cada jornada.</Text>
        <Text style={styles.tipText}>2. Completar notas al finalizar cada actividad.</Text>
        <Text style={styles.tipText}>3. Validar salas sin cobertura antes de cerrar el dia.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#EEF3FF',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  bgBlobTop: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#DCE8FF',
  },
  bgBlobBottom: {
    position: 'absolute',
    bottom: 80,
    left: -65,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#E6F7F3',
  },
  heroCard: {
    backgroundColor: '#F8FBFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#DFE8F8',
    shadowColor: '#163B8A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroEyebrow: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 26,
    marginTop: 6,
  },
  heroSubtitle: {
    marginTop: 6,
    color: palette.secondaryText,
    lineHeight: 21,
  },
  block: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DFE8F8',
    padding: 14,
    gap: 10,
    shadowColor: '#163B8A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  blockTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  itemIndex: {
    color: palette.primary,
    fontWeight: '800',
    marginTop: 1,
    minWidth: 24,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
  itemDetail: {
    color: palette.secondaryText,
    lineHeight: 20,
    marginTop: 2,
  },
  divider: {
    backgroundColor: palette.border,
  },
  tipText: {
    color: palette.secondaryText,
    lineHeight: 20,
  },
});
