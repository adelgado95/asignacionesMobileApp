// Shapes returned by the backend API.

export type AttendedValue = 'pendiente' | 'Asistio' | 'no asistio';

export type AsignationType = {
  type_name: string;
};

export type PersonType = {
  name: string;
};

export type Asignation = {
  id: number;
  asignation_date: string;
  asignation_type: AsignationType;
  person: PersonType;
  helper?: PersonType | null;
  room_display: string;
  attended_display?: string;
  asignation_number?: number;
  asignation_number_display: string;
  notes?: string;
  attended?: AttendedValue | null;
  tiempo?: number | null; // seconds, saved in the backend
};
