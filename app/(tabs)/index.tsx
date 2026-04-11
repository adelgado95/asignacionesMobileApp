import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, List, Menu, Modal, Portal, Text, TextInput, Title } from 'react-native-paper';

import { ThemedView } from '@/components/ThemedView';

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

const ATTENDED_CHOICES = [
  { value: 'pendiente', label: 'PENDIENTE' },
  { value: 'Asistio', label: 'ASISTIO' },
  { value: 'no asistio', label: 'NO ASISTIO' },
];

export default function HomeScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  // Add month/year state
  const [month, setMonth] = useState(8);
  const [year, setYear] = useState(2025);

  // Room filter state
  const [roomMenuVisible, setRoomMenuVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Day filter state
  const [dayMenuVisible, setDayMenuVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Menu state
  const [monthMenuVisible, setMonthMenuVisible] = useState(false);
  const [yearMenuVisible, setYearMenuVisible] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editAttended, setEditAttended] = useState('pendiente');

  // Add this state at the top with your other states:
  const [attendedMenuVisible, setAttendedMenuVisible] = useState(false);

  const showModal = (item?: any) => {
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

  // Add this function above useEffect:
  const loadData = () => {
    setLoading(true);
    fetch(`https://central.admincong.online/api/asignations-by-month/?format=json&month=${month}&year=${year}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      setVisible(false);
      setSelectedItem(null);
      loadData(); // <-- Reload data for current month after PATCH
    } catch (e) {
      // Handle error
    }
  };

  // Get unique room_display values for the room filter
  const roomOptions = Array.from(new Set(data.map((item: any) => item.room_display)));

  // Get unique days for the day selector
  const dayOptions = Array.from(new Set(data.map((item: any) => item.asignation_date)));

  // Filter data by selected room and day if any
  let filteredData = data;
  if (selectedRoom) {
    filteredData = filteredData.filter((item: any) => item.room_display === selectedRoom);
  }
  if (selectedDay) {
    filteredData = filteredData.filter((item: any) => item.asignation_date === selectedDay);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ marginTop: 32 }}>
        <Portal>
          <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={{ backgroundColor: 'white', padding: 20, borderRadius: 8 }}>
            {selectedItem && (
              <View>
                <Title style={{ textAlign: 'center', marginBottom: 8, color: 'black', fontWeight: 'bold' }}>
                  Detalle de Asignación
                </Title>
                <Text style={{ color: 'black' }}>
                  Fecha: <Text style={{ fontWeight: 'bold', color: 'black' }}>{selectedItem.asignation_date}</Text>
                </Text>
                <Text style={{ color: 'black' }}>
                  Tipo: <Text style={{ fontWeight: 'bold', color: 'black' }}>{selectedItem.asignation_type.type_name}</Text>
                </Text>
                <Text style={{ color: 'black' }}>
                  Persona: <Text style={{ fontWeight: 'bold', color: 'black' }}>{selectedItem.person.name}</Text>
                </Text>
                <Text style={{ color: 'black' }}>
                  Ayudante: <Text style={{ fontWeight: 'bold', color: 'black' }}>{selectedItem.helper ? selectedItem.helper.name : 'Sin ayudante'}</Text>
                </Text>
                <Text style={{ color: 'black' }}>
                  Sala: <Text style={{ fontWeight: 'bold', color: 'black' }}>{selectedItem.room_display}</Text>
                </Text>
                <Text style={{ color: 'black' }}>
                  Número: <Text style={{ fontWeight: 'bold', color: 'black' }}>{selectedItem.asignation_number_display}</Text>
                </Text>
                <Text style={{ marginTop: 12, color: 'black' }}>Estado:</Text>
                <Menu
                  visible={attendedMenuVisible}
                  onDismiss={() => setAttendedMenuVisible(false)}
                  anchor={
                    <Button mode="outlined" onPress={() => setAttendedMenuVisible(true)}>
                      <Text style={{ color: 'black', fontWeight: 'bold' }}>
                        {ATTENDED_CHOICES.find(a => a.value === editAttended)?.label || 'Estado'}
                      </Text>
                    </Button>
                  }
                >
                  {ATTENDED_CHOICES.map(a => (
                    <Menu.Item
                      key={a.value}
                      onPress={() => {
                        setEditAttended(a.value);
                        setAttendedMenuVisible(false);
                      }}
                      title={a.label}
                      titleStyle={{ color: 'black', fontWeight: 'bold' }}
                    />
                  ))}
                </Menu>
                <Text style={{ marginTop: 12, color: 'black' }}>Notas:</Text>
                <TextInput
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  mode="outlined"
                  style={{ marginBottom: 12, backgroundColor: 'white', color: 'black' }}
                  theme={{ colors: { text: 'black' } }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                  <Button mode="contained" onPress={handlePatch} style={{ flex: 1, marginRight: 8 }}>
                    Accept
                  </Button>
                  <Button mode="outlined" onPress={hideModal} style={{ flex: 1, marginLeft: 8 }}>
                    Close
                  </Button>
                </View>
              </View>
            )}
          </Modal>
        </Portal>
        <ThemedView style={styles.titleContainer}>
   
        </ThemedView>
        {/* ComboBox Selectors for Month, Year, Room, and Day */}
        <View style={{
          flexDirection: 'row',
          marginVertical: 12,
          gap: 12,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
        }}>
          {/* Month Selector */}
          <Menu
            visible={monthMenuVisible}
            onDismiss={() => setMonthMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setMonthMenuVisible(true)}>
                <Text style={{ color: 'black', fontWeight: 'bold' }}>
                  {MONTHS.find(m => m.value === month)?.label || 'Mes'}
                </Text>
              </Button>
            }
          >
            {MONTHS.map(m => (
              <Menu.Item
                key={m.value}
                onPress={() => {
                  setMonth(m.value);
                  setSelectedDay(null);      // Reset day selection
                  setSelectedRoom(null);     // Reset room selection
                  setMonthMenuVisible(false);
                }}
                title={m.label}
                titleStyle={{ color: 'black', fontWeight: 'bold' }}
              />
            ))}
          </Menu>
          {/* Year Selector */}
          <Menu
            visible={yearMenuVisible}
            onDismiss={() => setYearMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setYearMenuVisible(true)}>
                <Text style={{ color: 'black', fontWeight: 'bold' }}>
                  {year}
                </Text>
              </Button>
            }
          >
            {YEARS.map(y => (
              <Menu.Item
                key={y}
                onPress={() => {
                  setYear(y);
                  setYearMenuVisible(false);
                }}
                title={y.toString()}
                titleStyle={{ color: 'black', fontWeight: 'bold' }}
              />
            ))}
          </Menu>
          {/* Room Selector */}
          <Menu
            visible={roomMenuVisible}
            onDismiss={() => setRoomMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setRoomMenuVisible(true)}>
                <Text style={{ color: 'black', fontWeight: 'bold' }}>
                  {selectedRoom || 'Sala'}
                </Text>
              </Button>
            }
          >
            <Menu.Item
              key="all"
              onPress={() => {
                setSelectedRoom(null);
                setRoomMenuVisible(false);
              }}
              title="Todas las salas"
              titleStyle={{ color: 'black', fontWeight: 'bold' }}
            />
            {roomOptions.map(room => (
              <Menu.Item
                key={room}
                onPress={() => {
                  setSelectedRoom(room);
                  setRoomMenuVisible(false);
                }}
                title={room}
                titleStyle={{ color: 'black', fontWeight: 'bold' }}
              />
            ))}
          </Menu>
          {/* Day Selector */}
          <Menu
            visible={dayMenuVisible}
            onDismiss={() => setDayMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setDayMenuVisible(true)}>
                <Text style={{ color: 'black', fontWeight: 'bold' }}>
                  {selectedDay || 'Día'}
                </Text>
              </Button>
            }
          >
            <Menu.Item
              key="all-days"
              onPress={() => {
                setSelectedDay(null);
                setDayMenuVisible(false);
              }}
              title="Todos los días"
              titleStyle={{ color: 'black', fontWeight: 'bold' }}
            />
            {dayOptions.map(day => (
              <Menu.Item
                key={day}
                onPress={() => {
                  setSelectedDay(day);
                  setDayMenuVisible(false);
                }}
                title={day}
                titleStyle={{ color: 'black', fontWeight: 'bold' }}
              />
            ))}
          </Menu>
        </View>
        <Title style={{ textAlign: 'center', marginVertical: 8, fontWeight: 'bold', color:'black' }}>Asignaciones del mes</Title>
        {loading ? (
          <ActivityIndicator animating={true} size="large" />
        ) : (
          <View>
            {filteredData.map((item: any) => {
              let icon = 'alert-circle-outline';
              let iconColor = '#FFD600'; // yellow for PENDIENTE

              if (item.attended_display === 'ASISTIO') {
                icon = 'check-circle-outline';
                iconColor = '#43A047'; // green
              } else if (item.attended_display === 'NO ASISTIO') {
                icon = 'close-circle-outline';
                iconColor = '#E53935'; // red
              }

              return (
                <TouchableOpacity key={item.id} onPress={() => showModal(item)} activeOpacity={0.7}>
                  <List.Item
                    title={`${item.asignation_date} - ${item.asignation_type.type_name}`}
                    description={
                      `${item.person.name}` +
                      (item.helper ? ` (Ayudante: ${item.helper.name})` : '') +
                      ` - ${item.room_display} - Estado: ${item.attended_display || 'PENDIENTE'}`
                    }
                    left={props => <List.Icon {...props} icon={icon} color={iconColor} />}
                    style={styles.asignationItem}
                    titleStyle={{ color: 'black', fontWeight: 'bold' }}
                    descriptionStyle={{ color: 'black' }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  asignationItem: {
    marginBottom: 8,
  },
});
