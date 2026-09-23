export interface Page<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface Hospital {
  id: string;
  slug: string;
  name: string;
  type: 'PRIVATE' | 'GOVERNMENT';
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact: string | null;
  website: string | null;
  accreditation: string[];
  hasEmergency: boolean;
  beds: number | null;
  bedsNote: string | null;
  keySpecialties: string[];
  dataVerified: boolean;
  departments?: { id: string; name: string }[];
}

export interface DoctorAffiliation {
  id: string;
  hospitalId: string;
  schedulePending: boolean;
  hospital: { id: string; name: string; slug: string };
  department?: { id: string; name: string } | null;
  availabilityRules?: { dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number }[];
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  languages: string[];
  contactEmail: string | null;
  photoUrl: string | null;
  isDemo: boolean;
  isVerified: boolean;
  affiliations?: DoctorAffiliation[];
}

export interface Slot {
  affiliationId: string;
  hospitalId: string;
  startsAt: string;
  endsAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  affiliationId: string;
  startsAt: string;
  endsAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  reason: string | null;
  doctor?: { id: string; name: string; specialty: string };
  affiliation?: { hospital: { id: string; name: string } };
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

export interface Consent {
  id: string;
  purpose: 'MEDICAL_CARE' | 'APPOINTMENT_COMMUNICATIONS' | 'INSURANCE' | 'RESEARCH';
  policyVersion: string;
  grantedAt: string;
  withdrawnAt: string | null;
}

export interface ReminderLog {
  id: string;
  appointmentId: string;
  channel: 'EMAIL' | 'SMS' | 'CONSOLE';
  type: 'REMINDER_24H' | 'REMINDER_2H' | 'BOOKING_CONFIRMED' | 'RESCHEDULED' | 'CANCELLED';
  status: 'SENT' | 'SIMULATED' | 'QUEUED' | 'FAILED' | 'DISABLED';
  to: string;
  subject?: string;
  body?: string;
  sentAt: string;
  provider: string;
  patientName?: string;
  appointmentTime?: string;
}

export interface DoctorDailyLoad {
  date: string;
  day: string;
  confirmed: number;
  completed: number;
  noShow: number;
  cancelled: number;
  total: number;
}

export interface DoctorUpcomingVolume {
  date: string;
  day: string;
  patients: number;
  capacity: number;
}

export interface DoctorStats {
  summary: {
    todayCount: number;
    next24hCount: number;
    next24hRemindersSent: number;
    upcoming7DaysCount: number;
    completionRate: number;
    notificationProvider: string;
  };
  dailyLoads: DoctorDailyLoad[];
  upcomingVolume: DoctorUpcomingVolume[];
  hospitalBreakdown: { name: string; count: number }[];
  timeSlotBreakdown: { slot: string; count: number }[];
}

export interface DiagnosisRecord {
  id: string;
  appointmentId?: string;
  date: string;
  diagnosis: string;
  icdCode?: string;
  doctorName: string;
  doctorSpecialty: string;
  hospitalName: string;
  hospitalBranch?: string;
  clinicalNotes: string;
  status: 'RESOLVED' | 'CHRONIC' | 'ACTIVE' | 'FOLLOW_UP_REQUIRED';
  followUpDate?: string;
  vitals?: {
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    spO2?: string;
    weightKg?: number;
  };
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
}

export interface AllergyRecord {
  id: string;
  allergen: string;
  category: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'INSECT' | 'OTHER';
  severity: 'SEVERE' | 'MODERATE' | 'MILD';
  reaction: string;
  diagnosedAt: string;
  status: 'ACTIVE' | 'RESOLVED';
  notes?: string;
}

export interface VaccinationRecord {
  id: string;
  vaccineName: string;
  targetDisease: string;
  dose: string;
  administeredDate: string;
  facility: string;
  batchNumber: string;
  nextDueDate?: string | null;
  status: 'COMPLETED' | 'UPCOMING' | 'OVERDUE';
  notes?: string;
}

export interface PatientMedicalProfile {
  patient: {
    id: string;
    name: string;
    email: string;
    phone: string;
    bloodGroup: string;
    dob: string;
    gender: string;
    area: string;
    emergencyContact: {
      name: string;
      relation: string;
      phone: string;
    };
  };
  diagnoses: DiagnosisRecord[];
  allergies: AllergyRecord[];
  vaccinations: VaccinationRecord[];
}

