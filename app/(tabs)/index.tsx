import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
    ActivityIndicator,
    Button,
    List,
    Menu,
    Modal,
    Portal,
    Text,
    TextInput,
    Title,
} from 'react-native-paper';

import { Colors } from '@/constants/Colors';

type AttendedValue = 'pendiente' | 'Asistio' | 'no asistio';

type AsignationType = {
  type_name: string;
};

type PersonType = {
  name: string;
};

type Asignation = {
  id: number;
  asignation_date: string;
  asignation_type: AsignationType;
  person: PersonType;
  helper?: PersonType | null;
  room_display: string;
  attended_display?: string;
  asignation_number_display: string;
  notes?: string;
  attended?: AttendedValue;
};

const MONTHS = [
  { label: 'Enero', value: 1 },
  { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 },
  { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 },
  { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 },
  { label: 'Diciembre', value: 12 },
];

const YEARS = [2024, 2025, 2026];

const ATTENDED_CHOICES: { value: AttendedValue; label: string }[] = [
  { value: 'pendiente', label: 'PENDIENTE' },
  { value: 'Asistio', label: 'ASISTIO' },
  { value: 'no asistio', label: 'NO ASISTIO' },
];

const today = new Date();
const CURRENT_MONTH = today.getMonth() + 1;
const CURRENT_YEAR = today.getFullYear();

const palette = Colors.light;

export default function HomeScreen() {
  const [data, setData] = useState<Asignation[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);

  const [roomMenuVisible, setRoomMenuVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const [dayMenuVisible, setDayMenuVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [monthMenuVisible, setMonthMenuVisible] = useState(false);
  const [yearMenuVisible, setYearMenuVisible] = useState(false);

  const [selectedItem, setSelectedItem] = useState<Asignation | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editAttended, setEditAttended] = useState<AttendedValue>('pendiente');
  const [attendedMenuVisible, setAttendedMenuVisible] = useState(false);

  const showModal = (item?: Asignation) => {
    if (item) {
      setSelectedItem(item);
      setEditNotes(item.notes || '');
      setEditAttended(item.attended || 'pendiente');
    }
    setVisible(true);
  };

  const hideModal = () => {
    setVisible(false);
    setSelectedItem(null);
  };

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `https://central.admincong.online/api/asignations-by-month/?format=json&month=${month}&year=${year}`
      );
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const handlePatch = async () => {
    if (!selectedItem) return;

    try {
      await fetch(`https://central.admincong.online/api/asignations-edit/${selectedItem.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: editNotes,
          attended: editAttended,
        }),
      });
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
    () => Array.from(new Set(data.map((item) => item.asignation_date))),
    [data]
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const roomMatches = selectedRoom ? item.room_display === selectedRoom : true;
      const dayMatches = selectedDay ? item.asignation_date === selectedDay : true;
      return roomMatches && dayMatches;
    });
  }, [data, selectedDay, selectedRoom]);

  const monthLabel = MONTHS.find((m) => m.value === month)?.label || 'Mes';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />

      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modalContainer}>
          {selectedItem && (
            <View>
              <Title style={styles.modalTitle}>Detalle de Asignacion</Title>

              <Text style={styles.modalText}>
                Fecha: <Text style={styles.modalStrong}>{selectedItem.asignation_date}</Text>
              </Text>
              <Text style={styles.modalText}>
                Tipo: <Text style={styles.modalStrong}>{selectedItem.asignation_type.type_name}</Text>
              </Text>
              <Text style={styles.modalText}>
                Persona: <Text style={styles.modalStrong}>{selectedItem.person.name}</Text>
              </Text>
              <Text style={styles.modalText}>
                Ayudante:{' '}
                <Text style={styles.modalStrong}>
                  {selectedItem.helper ? selectedItem.helper.name : 'Sin ayudante'}
                </Text>
              </Text>
              <Text style={styles.modalText}>
                Sala: <Text style={styles.modalStrong}>{selectedItem.room_display}</Text>
              </Text>
              <Text style={styles.modalText}>
                Numero: <Text style={styles.modalStrong}>{selectedItem.asignation_number_display}</Text>
              </Text>

              <Text style={styles.fieldLabel}>Estado</Text>
              <Menu
                visible={attendedMenuVisible}
                onDismiss={() => setAttendedMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setAttendedMenuVisible(true)}
                    style={styles.fieldButton}
                    labelStyle={styles.fieldButtonLabel}>
                    {ATTENDED_CHOICES.find((a) => a.value === editAttended)?.label || 'Estado'}
                  </Button>
                }>
                {ATTENDED_CHOICES.map((option) => (
                  <Menu.Item
                    key={option.value}
                    onPress={() => {
                      setEditAttended(option.value);
                      setAttendedMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </Menu>

              <Text style={styles.fieldLabel}>Notas</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                mode="outlined"
                style={styles.notesInput}
                outlineColor={palette.border}
                activeOutlineColor={palette.primary}
              />

              <View style={styles.modalActions}>
                <Button mode="contained" onPress={handlePatch} style={styles.actionButton}>
                  Guardar
                </Button>
                <Button mode="outlined" onPress={hideModal} style={styles.actionButton}>
                  Cerrar
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Panel de asignaciones</Text>
        <Text style={styles.heroTitle}>Control mensual del programa</Text>
        <Text style={styles.heroSubtitle}>
          Filtra por fecha y sala, revisa estados rapidamente y actualiza notas en un solo flujo.
        </Text>
      </View>

      <View style={styles.filtersCard}>
        <Menu
          visible={monthMenuVisible}
          onDismiss={() => setMonthMenuVisible(false)}
          contentStyle={styles.dropdownMenu}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMonthMenuVisible(true)}
              style={styles.filterButton}
              labelStyle={styles.filterButtonLabel}>
              {monthLabel}
            </Button>
          }>
          {MONTHS.map((m) => (
            <Menu.Item
              key={m.value}
              onPress={() => {
                setMonth(m.value);
                setSelectedDay(null);
                setSelectedRoom(null);
                setMonthMenuVisible(false);
              }}
              title={m.label}
              style={month === m.value ? styles.dropdownItemActive : undefined}
              titleStyle={[
                styles.dropdownItemText,
                month === m.value ? styles.dropdownItemTextActive : undefined,
              ]}
            />
          ))}
        </Menu>

        <Menu
          visible={yearMenuVisible}
          onDismiss={() => setYearMenuVisible(false)}
          contentStyle={styles.dropdownMenu}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setYearMenuVisible(true)}
              style={styles.filterButton}
              labelStyle={styles.filterButtonLabel}>
              {String(year)}
            </Button>
          }>
          {YEARS.map((itemYear) => (
            <Menu.Item
              key={itemYear}
              onPress={() => {
                setYear(itemYear);
                setYearMenuVisible(false);
              }}
              title={itemYear.toString()}
              style={year === itemYear ? styles.dropdownItemActive : undefined}
              titleStyle={[
                styles.dropdownItemText,
                year === itemYear ? styles.dropdownItemTextActive : undefined,
              ]}
            />
          ))}
        </Menu>

        <Menu
          visible={roomMenuVisible}
          onDismiss={() => setRoomMenuVisible(false)}
          contentStyle={styles.dropdownMenu}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setRoomMenuVisible(true)}
              style={styles.filterButton}
              labelStyle={styles.filterButtonLabel}>
              {selectedRoom || 'Sala'}
            </Button>
          }>
          <Menu.Item
            key="all-rooms"
            onPress={() => {
              setSelectedRoom(null);
              setRoomMenuVisible(false);
            }}
            title="Todas las salas"
            style={!selectedRoom ? styles.dropdownItemActive : undefined}
            titleStyle={[
              styles.dropdownItemText,
              !selectedRoom ? styles.dropdownItemTextActive : undefined,
            ]}
          />
          {roomOptions.map((room) => (
            <Menu.Item
              key={room}
              onPress={() => {
                setSelectedRoom(room);
                setRoomMenuVisible(false);
              }}
              title={room}
              style={selectedRoom === room ? styles.dropdownItemActive : undefined}
              titleStyle={[
                styles.dropdownItemText,
                selectedRoom === room ? styles.dropdownItemTextActive : undefined,
              ]}
            />
          ))}
        </Menu>

        <Menu
          visible={dayMenuVisible}
          onDismiss={() => setDayMenuVisible(false)}
          contentStyle={styles.dropdownMenu}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setDayMenuVisible(true)}
              style={styles.filterButton}
              labelStyle={styles.filterButtonLabel}>
              {selectedDay || 'Dia'}
            </Button>
          }>
          <Menu.Item
            key="all-days"
            onPress={() => {
              setSelectedDay(null);
              setDayMenuVisible(false);
            }}
            title="Todos los dias"
            style={!selectedDay ? styles.dropdownItemActive : undefined}
            titleStyle={[
              styles.dropdownItemText,
              !selectedDay ? styles.dropdownItemTextActive : undefined,
            ]}
          />
          {dayOptions.map((day) => (
            <Menu.Item
              key={day}
              onPress={() => {
                setSelectedDay(day);
                setDayMenuVisible(false);
              }}
              title={day}
              style={selectedDay === day ? styles.dropdownItemActive : undefined}
              titleStyle={[
                styles.dropdownItemText,
                selectedDay === day ? styles.dropdownItemTextActive : undefined,
              ]}
            />
          ))}
        </Menu>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Asignaciones del mes</Text>
        <Text style={styles.sectionCaption}>{filteredData.length} registros</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator animating size="large" color={palette.primary} />
        </View>
      ) : (
        <View style={styles.listWrap}>
          {filteredData.map((item) => {
            let icon = 'alert-circle-outline';
            let iconColor: string = palette.warning;

            if (item.attended_display === 'ASISTIO') {
              icon = 'check-circle-outline';
              iconColor = palette.success;
            } else if (item.attended_display === 'NO ASISTIO') {
              icon = 'close-circle-outline';
              iconColor = palette.danger;
            }

            return (
              <TouchableOpacity key={item.id} onPress={() => showModal(item)} activeOpacity={0.88}>
                <List.Item
                  title={`${item.asignation_type.type_name}`}
                  description={
                    `${item.person.name}` +
                    (item.helper ? ` (Ayudante: ${item.helper.name})` : '') +
                    ` - ${item.room_display} - Estado: ${item.attended_display || 'PENDIENTE'}` +
                    ` - ${item.asignation_date}`
                  }
                  left={(props) => <List.Icon {...props} icon={icon} color={iconColor} />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" color={palette.icon} />}
                  style={styles.asignationItem}
                  titleStyle={styles.itemTitle}
                  descriptionStyle={styles.itemDescription}
                />
              </TouchableOpacity>
            );
          })}

          {filteredData.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sin resultados para los filtros seleccionados</Text>
              <Text style={styles.emptyText}>Cambia el dia o la sala para ver otras asignaciones.</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#EEF3FF',
  },
  pageContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  bgBlobTop: {
    position: 'absolute',
    top: -80,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 120,
    backgroundColor: '#DCE8FF',
  },
  bgBlobBottom: {
    position: 'absolute',
    bottom: 90,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E6F7F3',
  },
  hero: {
    backgroundColor: '#F8FBFF',
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#DDE7FB',
    shadowColor: '#163B8A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  eyebrow: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: palette.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 6,
  },
  heroSubtitle: {
    color: palette.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  filtersCard: {
    backgroundColor: '#FAFCFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DFE8F8',
    padding: 12,
    gap: 8,
    shadowColor: '#163B8A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  filterButton: {
    borderColor: '#D6E0F6',
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  filterButtonLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E4F8',
    shadowColor: '#163B8A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  dropdownItemActive: {
    backgroundColor: '#E8F0FF',
    borderRadius: 14,
  },
  dropdownItemText: {
    color: palette.text,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: palette.primary,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionCaption: {
    color: palette.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  loadingWrap: {
    paddingVertical: 24,
  },
  listWrap: {
    gap: 10,
  },
  asignationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DFE8F8',
    paddingVertical: 4,
    shadowColor: '#163B8A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  itemTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 15,
  },
  itemDescription: {
    color: palette.secondaryText,
    marginTop: 2,
    lineHeight: 19,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCE6FA',
    shadowColor: '#163B8A',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 10,
    color: palette.text,
    fontWeight: '800',
  },
  modalText: {
    color: palette.secondaryText,
    marginBottom: 2,
  },
  modalStrong: {
    color: palette.text,
    fontWeight: '700',
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    color: palette.text,
    fontWeight: '700',
  },
  fieldButton: {
    borderColor: '#D6E0F6',
    borderRadius: 14,
    backgroundColor: '#F7FAFF',
  },
  fieldButtonLabel: {
    color: palette.text,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#F7FAFF',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFE8F8',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: palette.secondaryText,
    marginTop: 4,
    lineHeight: 20,
  },
});
