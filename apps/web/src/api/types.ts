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
