export enum StatusType {
  ACTIVE = 'IN_SERVICE', // Activo
  INACTIVE = 'DOWN' // Inactivo
}

export enum EmployeeType {
  ADMIN = 'ADMIN', // Administrador
  SECURITY = 'SECURITY'
}

export enum DocumentType {
  DNI = 'DNI', // Documento Nacional de Identidad
  PASSPORT = 'PASSPORT', // Pasaporte
  CUIT = 'CUIT',
  CUIL= 'CUIL'
}

export enum ShiftType {
  DAY = 'DAY', // Turno de día
  NIGHT = 'NIGHT' // Turno de noche
}

export interface ShiftSchedule {
  entryTime: string; // Hora de entrada
  exitTime: string;  // Hora de salida
}

export interface EmployeeShifts {
  shifts: string[]; // Turnos asignados al empleado
  shiftType: ShiftType; // Tipo de turno (día, noche)
}

// Definimos la interfaz Employee para representar un empleado en el sistema.
export interface Employee {
  id: number; // Identificador único del empleado.
  firstName: string; // Primer nombre del empleado.
  lastName: string; // Apellido del empleado.
  employeeType: EmployeeType; // Tipo de empleado (ej. Admin, Técnico, etc.).
  documentType: DocumentType; // Tipo de documento (DNI, Pasaporte, etc.).
  docNumber: string; // Número del documento del empleado.
  hiringDate: string; // Fecha de contratación del empleado.
  salary: number; // Salario del empleado.
  state: StatusType; // Estado del empleado (Activo o Inactivo).
  //enabled: boolean; // Estado del empleado (Activo o Inactivo).
}

export interface EmployeePayment {
  id: number;
  employeeId: number;
  paymentDate: string; // Fecha de pago
  paymentAmount: number; // Monto de pago
  paymentDetail: string; // Detalle del pago
}
export interface EmployeeFilter {
  firstName?: string;
  lastName?: string;
  employeeType?: EmployeeType;
  docType?: DocumentType;
  docNumber?: string;
  hiringDate?: Date;
  salary?: number;
  state?: StatusType;
  enabled?: boolean;
}

//Access interface

// Enum para los tipos de contacto
export enum ContactType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  // Añade otros tipos según necesites
}

// Interface para el contacto
export interface Contact {
  contact_value: string;
  contact_type: ContactType;
}

// Interface para los días de la semana
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

// Interface para el rango de autorización
export interface AuthRange {
  date_from: string;  // formato: "DD-MM-YYYY"
  date_to: string;    // formato: "DD-MM-YYYY"
  hour_from: string;  // formato: "HH:mm:ss"
  hour_to: string;    // formato: "HH:mm:ss"
  days_of_week: DayOfWeek[];
  comment: string;
}

// Interface para la solicitud de rango de autorización
export interface AuthRangeRequest {
  auth_range_request: AuthRange[];
}

// Interface para el formulario (opcional, pero útil para tipado fuerte en el componente)
export interface AccessFormData {
  dateFrom: string;
  dateTo: string;
  hourFrom: string;
  hourTo: string;
  daysOfWeek: DayOfWeek[];
  comment?: string;
}