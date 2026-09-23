import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawHospital {
  id?: string;
  slug: string;
  name: string;
  type?: 'PRIVATE' | 'GOVERNMENT';
  hospital_type?: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  departments: string[];
  contact?: string | null;
  phone?: string | null;
  website: string | null;
  accreditation?: string[];
  hasEmergency?: boolean;
  emergency_available?: boolean;
  beds?: number | null;
  bedsNote?: string | null;
  keySpecialties?: string[];
  dataVerified?: boolean;
}

interface RawDoctor {
  id?: string;
  name: string;
  specialty: string;
  qualifications: string | string[];
  department?: string;
  languages: string[];
  contactEmail?: string | null;
  photoUrl?: string | null;
  isDemo?: boolean;
  is_demo_data?: boolean;
  isVerified?: boolean;
  demoLoginEmail?: string;
  affiliations?: {
    hospitalSlug: string;
    schedulePending: boolean;
    availabilityRules: { dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number }[];
  }[];
  hospital_ids?: string[];
  primary_hospital_id?: string;
}

interface MockNotificationLog {
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

export function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api-server',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createMockMiddleware());
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(createMockMiddleware());
    },
  };
}

function createMockMiddleware() {
  const rootDir = path.resolve(__dirname, '../..');
  const hospitalsPath = fs.existsSync(path.join(rootDir, 'data', 'hospitals.json'))
    ? path.join(rootDir, 'data', 'hospitals.json')
    : path.join(rootDir, 'seed', 'hospitals.json');
  const doctorsPath = fs.existsSync(path.join(rootDir, 'data', 'doctors.json'))
    ? path.join(rootDir, 'data', 'doctors.json')
    : path.join(rootDir, 'seed', 'doctors.json');
  const patientsPath = fs.existsSync(path.join(rootDir, 'data', 'patients.json'))
    ? path.join(rootDir, 'data', 'patients.json')
    : path.join(rootDir, 'seed', 'patients.json');
  const appointmentsPath = fs.existsSync(path.join(rootDir, 'data', 'appointments.json'))
    ? path.join(rootDir, 'data', 'appointments.json')
    : path.join(rootDir, 'seed', 'appointments.json');
  const prescriptionsPath = fs.existsSync(path.join(rootDir, 'data', 'prescriptions.json'))
    ? path.join(rootDir, 'data', 'prescriptions.json')
    : path.join(rootDir, 'seed', 'prescriptions.json');

  let rawHospitals: RawHospital[] = [];
  let rawDoctors: RawDoctor[] = [];
  let rawPatients: any[] = [];
  let rawAppointments: any[] = [];
  let rawPrescriptions: any[] = [];

  try {
    if (fs.existsSync(hospitalsPath)) {
      rawHospitals = JSON.parse(fs.readFileSync(hospitalsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to load hospitals:', err);
  }

  try {
    if (fs.existsSync(doctorsPath)) {
      rawDoctors = JSON.parse(fs.readFileSync(doctorsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to load doctors:', err);
  }

  try {
    if (fs.existsSync(patientsPath)) {
      rawPatients = JSON.parse(fs.readFileSync(patientsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to load patients:', err);
  }

  try {
    if (fs.existsSync(appointmentsPath)) {
      rawAppointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to load appointments:', err);
  }

  try {
    if (fs.existsSync(prescriptionsPath)) {
      rawPrescriptions = JSON.parse(fs.readFileSync(prescriptionsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to load prescriptions:', err);
  }

  const hospitalsMap = new Map<string, any>();
  const hospitalsList = rawHospitals.map((h) => {
    const hospType = h.type || (h.hospital_type?.toLowerCase().includes('govt') || h.hospital_type?.toLowerCase().includes('government') ? 'GOVERNMENT' : 'PRIVATE');
    const item = {
      id: h.slug,
      slug: h.slug,
      name: h.name,
      type: hospType,
      address: h.address,
      latitude: h.latitude,
      longitude: h.longitude,
      contact: h.contact || h.phone,
      website: h.website,
      accreditation: h.accreditation || [],
      hasEmergency: h.hasEmergency ?? h.emergency_available ?? true,
      beds: h.beds,
      bedsNote: h.bedsNote,
      keySpecialties: h.keySpecialties || h.departments || [],
      dataVerified: h.dataVerified ?? !((h as any).is_demo_data),
      departments: (h.departments || []).map((d) => ({
        id: d.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: d,
      })),
    };
    hospitalsMap.set(item.id, item);
    hospitalsMap.set(item.slug, item);
    if ((h as any).id) {
      hospitalsMap.set((h as any).id, item);
    }
    return item;
  });

  const doctorsMap = new Map<string, any>();
  const doctorsList = rawDoctors.map((d, i) => {
    const docId = (d as any).id || `doc-${i + 1}`;
    const quals = Array.isArray(d.qualifications) ? d.qualifications.join(', ') : (d.qualifications || 'MBBS');
    const affiliations = (d.affiliations || []).map((aff, affIdx) => {
      const h = hospitalsMap.get(aff.hospitalSlug) || {
        id: aff.hospitalSlug,
        slug: aff.hospitalSlug,
        name: aff.hospitalSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      };
      return {
        id: `aff-${docId}-${affIdx + 1}`,
        hospitalId: h.id,
        schedulePending: aff.schedulePending ?? false,
        hospital: { id: h.id, name: h.name, slug: h.slug },
        department: d.department ? { id: d.department.toLowerCase(), name: d.department } : null,
        availabilityRules: aff.availabilityRules || [
          { dayOfWeek: 1, startTime: '10:00', endTime: '16:00', slotMinutes: 20 },
          { dayOfWeek: 2, startTime: '10:00', endTime: '16:00', slotMinutes: 20 },
          { dayOfWeek: 3, startTime: '10:00', endTime: '16:00', slotMinutes: 20 },
          { dayOfWeek: 4, startTime: '10:00', endTime: '16:00', slotMinutes: 20 },
          { dayOfWeek: 5, startTime: '10:00', endTime: '16:00', slotMinutes: 20 },
        ],
      };
    });

    // If affiliations was empty, provide affiliation with primary_hospital_id or hospital_ids
    if (affiliations.length === 0 && ((d as any).primary_hospital_id || (d as any).hospital_ids?.length)) {
      const hospRefId = (d as any).primary_hospital_id || (d as any).hospital_ids[0];
      const h = hospitalsMap.get(hospRefId) || {
        id: hospRefId,
        slug: hospRefId,
        name: 'Apollo Hospital',
      };
      affiliations.push({
        id: `aff-${docId}-1`,
        hospitalId: h.id,
        schedulePending: false,
        hospital: { id: h.id, name: h.name, slug: h.slug },
        department: d.department ? { id: d.department.toLowerCase(), name: d.department } : null,
        availabilityRules: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
          { dayOfWeek: 2, startTime: '14:00', endTime: '18:00', slotMinutes: 15 },
          { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
          { dayOfWeek: 4, startTime: '14:00', endTime: '18:00', slotMinutes: 15 },
          { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
          { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
        ],
      });
    }

    const item = {
      id: docId,
      name: d.name,
      specialty: d.specialty,
      qualifications: quals,
      languages: d.languages || ['English'],
      contactEmail: d.contactEmail,
      photoUrl: d.photoUrl,
      isDemo: d.isDemo ?? ((d as any).is_demo_data ?? true),
      isVerified: d.isVerified ?? (typeof (d as any).is_demo_data === 'boolean' ? !(d as any).is_demo_data : false),
      affiliations,
    };
    doctorsMap.set(docId, item);
    if ((d as any).id) {
      doctorsMap.set((d as any).id, item);
    }
    return item;
  });

  let currentUser = {
    id: 'user-doctor-1',
    email: 'priya.kapoor@example.test',
    role: 'DOCTOR',
  };

  const primaryDoc = doctorsList[0] || {
    id: 'doc-1',
    name: 'Dr. Priya Kapoor',
    specialty: 'Cardiology',
    affiliations: [
      {
        id: 'aff-doc-1-1',
        hospitalId: 'apollo-hospital-bannerghatta-road',
        hospital: { id: 'apollo-hospital-bannerghatta-road', name: 'Apollo Hospital, Bannerghatta Road', slug: 'apollo-hospital-bannerghatta-road' },
        availabilityRules: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '16:00', slotMinutes: 20 },
          { dayOfWeek: 2, startTime: '09:00', endTime: '16:00', slotMinutes: 20 },
          { dayOfWeek: 3, startTime: '09:00', endTime: '16:00', slotMinutes: 20 },
          { dayOfWeek: 4, startTime: '09:00', endTime: '16:00', slotMinutes: 20 },
          { dayOfWeek: 5, startTime: '09:00', endTime: '16:00', slotMinutes: 20 },
        ],
      },
    ],
  };

  const samplePatients = [
    { name: 'Aarav Sharma', email: 'aarav.sharma@example.test', phone: '+91-98801-11223' },
    { name: 'Kavita Reddy', email: 'kavita.reddy@example.test', phone: '+91-98802-33445' },
    { name: 'Rohan Nambiar', email: 'rohan.nambiar@example.test', phone: '+91-98803-55667' },
    { name: 'Meera Iyer', email: 'meera.iyer@example.test', phone: '+91-98804-77889' },
    { name: 'Siddharth Rao', email: 'siddharth.rao@example.test', phone: '+91-98805-99001' },
    { name: 'Deepa Hegde', email: 'deepa.hegde@example.test', phone: '+91-98806-22334' },
    { name: 'Ananya Nair', email: 'ananya.nair@example.test', phone: '+91-98807-44556' },
    { name: 'Vikram Pai', email: 'vikram.pai@example.test', phone: '+91-98808-66778' },
  ];

  // Helper to build dates
  const now = new Date();
  const buildDate = (dayOffset: number, hour: number, minute: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const sampleReasons = [
    'Hypertension follow-up & BP review',
    'Post-angioplasty cardiac check',
    'Routine ECG evaluation & chest discomfort check',
    'Arrhythmia assessment & Holter review',
    'Pre-operative cardiac clearance',
    'Lipid profile & cholesterol medication review',
    'Breathlessness on exertion consultation',
    'Annual preventive cardiovascular checkup',
  ];

  const appointments: any[] = [];
  let apptSeq = 1;

  const addAppt = (
    dayOffset: number,
    hour: number,
    minute: number,
    status: 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'PENDING',
    patIdx: number,
    hospitalSlug?: string,
    exactMsOffset?: number
  ) => {
    const startsAt = exactMsOffset != null ? new Date(Date.now() + exactMsOffset) : buildDate(dayOffset, hour, minute);
    const endsAt = new Date(startsAt.getTime() + 20 * 60000);
    const patient = samplePatients[patIdx % samplePatients.length];
    const aff = hospitalSlug
      ? primaryDoc.affiliations?.find((a: any) => a.hospital.slug === hospitalSlug) || primaryDoc.affiliations?.[0]
      : primaryDoc.affiliations?.[0];

    appointments.push({
      id: `appt-${1000 + apptSeq++}`,
      patientId: `pat-${patIdx + 1}`,
      doctorId: primaryDoc.id,
      affiliationId: aff?.id || 'aff-doc-1-1',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status,
      reason: sampleReasons[(apptSeq + patIdx) % sampleReasons.length],
      patient: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
      },
      doctor: {
        id: primaryDoc.id,
        name: primaryDoc.name,
        specialty: primaryDoc.specialty,
      },
      affiliation: {
        hospital: {
          id: aff?.hospital?.id || 'apollo-hospital-bannerghatta-road',
          name: aff?.hospital?.name || 'Apollo Hospital, Bannerghatta Road',
        },
      },
    });
  };

  // Seed past 2 days (historical load)
  addAppt(-2, 9, 30, 'COMPLETED', 0);
  addAppt(-2, 10, 30, 'COMPLETED', 1);
  addAppt(-2, 12, 0, 'COMPLETED', 2);
  addAppt(-2, 14, 30, 'NO_SHOW', 3);
  addAppt(-2, 16, 0, 'CANCELLED', 4);

  addAppt(-1, 9, 0, 'COMPLETED', 5);
  addAppt(-1, 10, 0, 'COMPLETED', 6);
  addAppt(-1, 11, 20, 'COMPLETED', 7);
  addAppt(-1, 14, 0, 'COMPLETED', 0);
  addAppt(-1, 15, 30, 'NO_SHOW', 1);

  // Seed Today (day 0)
  addAppt(0, 9, 30, 'COMPLETED', 2);
  addAppt(0, 11, 0, 'CONFIRMED', 3);
  addAppt(0, 14, 0, 'CONFIRMED', 4);
  addAppt(0, 15, 30, 'CONFIRMED', 5);

  // Seed Tomorrow (+1) - visits within the 24h window (22 to 26 hours from now)
  addAppt(1, 9, 30, 'CONFIRMED', 6, undefined, 23.0 * 3600_000);
  addAppt(1, 10, 30, 'CONFIRMED', 7, undefined, 23.5 * 3600_000);
  addAppt(1, 11, 40, 'CONFIRMED', 0, undefined, 24.0 * 3600_000);
  addAppt(1, 14, 20, 'CONFIRMED', 1, undefined, 24.5 * 3600_000);
  addAppt(1, 16, 0, 'CONFIRMED', 2, undefined, 25.0 * 3600_000);

  // Seed upcoming days (+2 to +6)
  addAppt(2, 9, 30, 'CONFIRMED', 3);
  addAppt(2, 10, 30, 'CONFIRMED', 4);
  addAppt(2, 11, 30, 'CONFIRMED', 5);
  addAppt(2, 14, 0, 'CONFIRMED', 6);
  addAppt(2, 15, 20, 'CONFIRMED', 7);
  addAppt(2, 16, 30, 'PENDING', 0);

  addAppt(3, 10, 0, 'CONFIRMED', 1);
  addAppt(3, 11, 20, 'CONFIRMED', 2);
  addAppt(3, 14, 0, 'CONFIRMED', 3);
  addAppt(3, 15, 40, 'CONFIRMED', 4);

  addAppt(4, 9, 0, 'CONFIRMED', 5);
  addAppt(4, 10, 0, 'CONFIRMED', 6);
  addAppt(4, 11, 0, 'CONFIRMED', 7);
  addAppt(4, 12, 0, 'CONFIRMED', 0);
  addAppt(4, 14, 30, 'CONFIRMED', 1);
  addAppt(4, 15, 30, 'CONFIRMED', 2);
  addAppt(4, 16, 30, 'PENDING', 3);

  addAppt(5, 9, 30, 'CONFIRMED', 4);
  addAppt(5, 11, 0, 'CONFIRMED', 5);
  addAppt(5, 14, 0, 'CONFIRMED', 6);
  addAppt(5, 15, 30, 'CONFIRMED', 7);
  addAppt(5, 16, 30, 'CONFIRMED', 0);

  addAppt(6, 10, 0, 'CONFIRMED', 1);
  addAppt(6, 11, 30, 'CONFIRMED', 2);
  addAppt(6, 14, 30, 'CONFIRMED', 3);

  // Integrate production seed dataset appointments
  if (rawAppointments.length > 0) {
    const patientMap = new Map(rawPatients.map((p) => [p.id, p]));
    rawAppointments.forEach((a) => {
      const doc = doctorsMap.get(a.doctor_id) || primaryDoc;
      const hosp = hospitalsMap.get(a.hospital_id) || doc.affiliations?.[0]?.hospital || {
        id: a.hospital_id,
        name: 'Bangalore Hospital',
      };
      const pat = patientMap.get(a.patient_id) || {
        name: `Patient ${a.patient_id}`,
        email: `${a.patient_id}@example.test`,
        phone: '+91-90000-00000',
      };
      const startsAt = `${a.date}T${a.start_time}:00.000Z`;
      const endsAt = `${a.date}T${a.end_time}:00.000Z`;

      appointments.push({
        id: a.id,
        patientId: a.patient_id,
        doctorId: doc.id,
        affiliationId: doc.affiliations?.[0]?.id || `aff-${doc.id}-1`,
        startsAt,
        endsAt,
        status: (a.status || 'CONFIRMED').toUpperCase(),
        reason: a.reason || 'General Medical Consultation',
        patient: {
          name: pat.name,
          email: pat.email,
          phone: pat.phone,
        },
        doctor: {
          id: doc.id,
          name: doc.name,
          specialty: doc.specialty,
        },
        affiliation: {
          hospital: {
            id: hosp.id || hosp.slug,
            name: hosp.name,
          },
        },
      });
    });
  }

  const consents: any[] = [
    {
      id: 'c-1',
      purpose: 'MEDICAL_CARE',
      policyVersion: '1.0',
      grantedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      withdrawnAt: null,
    },
    {
      id: 'c-2',
      purpose: 'APPOINTMENT_COMMUNICATIONS',
      policyVersion: '1.0',
      grantedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      withdrawnAt: null,
    },
  ];

  const notificationLogs: MockNotificationLog[] = [];
  const timeOffList: any[] = [];

  const patientAllergies: any[] = [
    {
      id: 'alg-1',
      allergen: 'Amoxicillin / Penicillin Group',
      category: 'DRUG',
      severity: 'SEVERE',
      reaction: 'Anaphylactoid reaction, severe urticaria and facial angioedema',
      diagnosedAt: '2024-03-12',
      status: 'ACTIVE',
      notes: 'Carries emergency epinephrine notice. Strictly avoid beta-lactam antibiotics.',
    },
    {
      id: 'alg-2',
      allergen: 'Sulfa Drugs / Sulfonamides',
      category: 'DRUG',
      severity: 'MODERATE',
      reaction: 'Maculopapular rash, generalized pruritus and low-grade pyrexia',
      diagnosedAt: '2023-08-19',
      status: 'ACTIVE',
      notes: 'Documented after Co-trimoxazole treatment for UTI.',
    },
    {
      id: 'alg-3',
      allergen: 'Peanuts & Tree Nuts',
      category: 'FOOD',
      severity: 'SEVERE',
      reaction: 'Throat constriction, acute wheezing and dyspnea',
      diagnosedAt: '2019-11-20',
      status: 'ACTIVE',
      notes: 'Patient carries emergency antihistamines.',
    },
    {
      id: 'alg-4',
      allergen: 'Bangalore Pollen & Parthenium Dust',
      category: 'ENVIRONMENTAL',
      severity: 'MILD',
      reaction: 'Seasonal allergic rhinitis, ocular itching, and morning sneezing bouts',
      diagnosedAt: '2021-10-04',
      status: 'ACTIVE',
      notes: 'Symptoms flare up during post-monsoon months (September - November).',
    },
  ];

  const patientVaccinations: any[] = [
    {
      id: 'vac-1',
      vaccineName: 'COVID-19 (Covishield / ChAdOx1 nCoV-19)',
      targetDisease: 'SARS-CoV-2',
      dose: 'Precautionary Booster Dose (Dose 3)',
      administeredDate: '2023-04-18',
      facility: 'Apollo Hospital, Bannerghatta Road',
      batchNumber: 'AZ-991402',
      nextDueDate: null,
      status: 'COMPLETED',
      notes: 'No adverse reactions noted. Verified on CoWIN / ABHA portal.',
    },
    {
      id: 'vac-2',
      vaccineName: 'Influenza Quadrivalent (Fluarix Tetra 2025/2026)',
      targetDisease: 'Seasonal Influenza (H1N1, H3N2, Victoria, Yamagata)',
      dose: 'Annual Shot',
      administeredDate: '2025-10-14',
      facility: 'Manipal Hospital, HAL Old Airport Road',
      batchNumber: 'FL-2025-88A',
      nextDueDate: '2026-10-14',
      status: 'COMPLETED',
      notes: 'Recommended annual booster due in October 2026.',
    },
    {
      id: 'vac-3',
      vaccineName: 'Hepatitis B Recombinant Vaccine',
      targetDisease: 'Hepatitis B Virus',
      dose: 'Completed 3-Dose Series',
      administeredDate: '2022-01-10',
      facility: "St. John's Medical College Hospital, Koramangala",
      batchNumber: 'HB-7721-K',
      nextDueDate: null,
      status: 'COMPLETED',
      notes: 'Anti-HBs titer post-vaccination confirmed protective (>100 mIU/mL).',
    },
    {
      id: 'vac-4',
      vaccineName: 'Tdap (Tetanus, Diphtheria, Acellular Pertussis)',
      targetDisease: 'Tetanus, Diphtheria, Whooping Cough',
      dose: 'Decennial Adult Booster',
      administeredDate: '2022-06-25',
      facility: 'Fortis Hospital, Cunningham Road',
      batchNumber: 'TD-4401-F',
      nextDueDate: '2032-06-25',
      status: 'COMPLETED',
      notes: 'Valid for 10 years until June 2032.',
    },
    {
      id: 'vac-5',
      vaccineName: 'Typhoid Conjugate Vaccine (Typbar TCV)',
      targetDisease: 'Salmonella Typhi',
      dose: 'Single Conjugate Dose',
      administeredDate: '2021-09-15',
      facility: 'Narayana Health City, Bommasandra',
      batchNumber: 'TCV-3310-N',
      nextDueDate: null,
      status: 'COMPLETED',
      notes: 'Long-term protective immunity documented.',
    },
  ];

  // Automated 24-hour reminder service
  const run24HourReminderCheck = () => {
    const curTime = Date.now();
    const windowStart = curTime + 22 * 60 * 60 * 1000; // 22h ahead
    const windowEnd = curTime + 26 * 60 * 60 * 1000; // 26h ahead

    const provider = process.env.NOTIFICATION_PROVIDER || 'console';
    let count = 0;
    const sentList: any[] = [];

    for (const appt of appointments) {
      if (appt.status !== 'CONFIRMED' && appt.status !== 'PENDING') continue;
      const apptTime = new Date(appt.startsAt).getTime();

      // Check if scheduled within the 24-hour window
      if (apptTime >= windowStart && apptTime <= windowEnd) {
        const alreadyNotified = notificationLogs.some(
          (l) => l.appointmentId === appt.id && l.type === 'REMINDER_24H'
        );

        if (!alreadyNotified) {
          const patientName = appt.patient?.name || 'Patient';
          const patientEmail = appt.patient?.email || 'patient@example.test';
          const patientPhone = appt.patient?.phone || '+91-98800-00000';
          const docName = appt.doctor?.name || primaryDoc.name;
          const hospName = appt.affiliation?.hospital?.name || 'Hospital';
          const formattedDate = new Date(appt.startsAt).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short',
          });

          const emailSubject = `Reminder: Appointment with ${docName} in 24 hours`;
          const messageBody = `Dear ${patientName}, this is a reminder for your upcoming medical consultation with ${docName} at ${hospName} scheduled for ${formattedDate} IST. Booking ID: ${appt.id}.`;

          // Email notification log
          const emailLog: MockNotificationLog = {
            id: `notif-email-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            appointmentId: appt.id,
            channel: 'EMAIL',
            type: 'REMINDER_24H',
            status: provider === 'sendgrid' && process.env.SENDGRID_API_KEY ? 'SENT' : 'SIMULATED',
            to: patientEmail,
            subject: emailSubject,
            body: messageBody,
            sentAt: new Date().toISOString(),
            provider: provider === 'sendgrid' ? 'SendGrid' : 'Console Provider (Simulated)',
            patientName,
            appointmentTime: appt.startsAt,
          };
          notificationLogs.unshift(emailLog);

          // SMS notification log
          const smsLog: MockNotificationLog = {
            id: `notif-sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            appointmentId: appt.id,
            channel: 'SMS',
            type: 'REMINDER_24H',
            status: provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID ? 'SENT' : 'SIMULATED',
            to: patientPhone,
            body: `[Bangalore Hospital Appointments] Reminder: Visit with ${docName} on ${formattedDate} IST. ID: ${appt.id}`,
            sentAt: new Date().toISOString(),
            provider: provider === 'twilio' ? 'Twilio' : 'Console Provider (Simulated)',
            patientName,
            appointmentTime: appt.startsAt,
          };
          notificationLogs.unshift(smsLog);

          count += 1;
          sentList.push({
            appointmentId: appt.id,
            patientName,
            patientEmail,
            patientPhone,
            startsAt: appt.startsAt,
            channel: 'EMAIL & SMS',
            provider,
          });

          // eslint-disable-next-line no-console
          console.log(`[ReminderCron] 24h reminder dispatched to ${patientEmail} & ${patientPhone} for appointment ${appt.id} (${formattedDate} IST)`);
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      provider,
      sentCount: count,
      reminders: sentList,
    };
  };

  // Run initial reminder check on boot
  try {
    run24HourReminderCheck();
  } catch (err) {
    console.warn('[ReminderCron] Startup check error:', err);
  }

  // Periodic automated cron timer (runs every 60 seconds)
  const cronTimer = setInterval(() => {
    try {
      run24HourReminderCheck();
    } catch (err) {
      console.warn('[ReminderCron] Timer run error:', err);
    }
  }, 60_000);

  if (cronTimer.unref) {
    cronTimer.unref();
  }

  return async (req: any, res: any, next: any) => {
    const url = new URL(req.url || '/', 'http://localhost:3000');
    const pathname = url.pathname;

    if (!pathname.startsWith('/api/') && pathname !== '/health') {
      return next();
    }

    const sendJson = (status: number, data: any) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };

    const parseBody = (): Promise<any> => {
      return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      });
    };

    // Health
    if (pathname === '/health' || pathname === '/api/health') {
      return sendJson(200, { status: 'ok', time: new Date().toISOString() });
    }

    // Auth routes
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      return sendJson(200, { data: { user: currentUser } });
    }

    if (pathname === '/api/auth/refresh' && req.method === 'POST') {
      return sendJson(200, { data: { accessToken: 'mock-access-token', user: currentUser } });
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseBody();
      const email = body.email || 'priya.kapoor@example.test';
      let role = 'DOCTOR';
      if (email.includes('admin')) role = 'ADMIN';
      else if (email.includes('patient')) role = 'PATIENT';
      currentUser = { id: `user-${Date.now()}`, email, role: role as any };
      return sendJson(200, { data: { accessToken: 'mock-access-token', user: currentUser } });
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await parseBody();
      const email = body.email || 'patient@example.test';
      currentUser = { id: `user-${Date.now()}`, email, role: 'PATIENT' };
      return sendJson(200, { data: { user: currentUser } });
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      currentUser = { id: 'anon', email: '', role: 'PATIENT' };
      return sendJson(200, { data: { ok: true } });
    }

    // 24-Hour Reminder Cron manual trigger & logs
    if ((pathname === '/api/appointments/reminders/process-24h' || pathname === '/api/cron/reminders-24h') && req.method === 'POST') {
      const result = run24HourReminderCheck();
      return sendJson(200, { data: result });
    }

    if ((pathname === '/api/appointments/reminders/logs' || pathname === '/api/notifications/reminders') && req.method === 'GET') {
      return sendJson(200, { data: notificationLogs.slice(0, 50) });
    }

    // Doctor stats and dashboard analytics
    if (pathname === '/api/doctors/me/stats' && req.method === 'GET') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Build dailyLoads for past 2 days, today, and next 5 days (8 days total)
      const dailyLoads: any[] = [];
      for (let offset = -2; offset <= 5; offset++) {
        const d = buildDate(offset, 0, 0);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;

        const dayAppts = appointments.filter((a) => {
          const ad = new Date(a.startsAt);
          return (
            ad.getFullYear() === d.getFullYear() &&
            ad.getMonth() === d.getMonth() &&
            ad.getDate() === d.getDate()
          );
        });

        const confirmed = dayAppts.filter((a) => a.status === 'CONFIRMED' || a.status === 'PENDING').length;
        const completed = dayAppts.filter((a) => a.status === 'COMPLETED').length;
        const noShow = dayAppts.filter((a) => a.status === 'NO_SHOW').length;
        const cancelled = dayAppts.filter((a) => a.status === 'CANCELLED').length;

        dailyLoads.push({
          date: dateStr,
          day: dayLabel,
          confirmed,
          completed,
          noShow,
          cancelled,
          total: dayAppts.length,
        });
      }

      // Build upcomingVolume for next 7 days
      const upcomingVolume: any[] = [];
      for (let offset = 0; offset < 7; offset++) {
        const d = buildDate(offset, 0, 0);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;

        const dayAppts = appointments.filter((a) => {
          const ad = new Date(a.startsAt);
          return (
            ad.getFullYear() === d.getFullYear() &&
            ad.getMonth() === d.getMonth() &&
            ad.getDate() === d.getDate() &&
            a.status !== 'CANCELLED'
          );
        });

        upcomingVolume.push({
          date: dateStr,
          day: dayLabel,
          patients: dayAppts.length,
          capacity: 12, // typical max consultation slots per day
        });
      }

      // Hospital distribution
      const hospitalCountMap = new Map<string, number>();
      appointments.forEach((a) => {
        if (a.status !== 'CANCELLED') {
          const hName = a.affiliation?.hospital?.name || 'Apollo Hospital';
          hospitalCountMap.set(hName, (hospitalCountMap.get(hName) || 0) + 1);
        }
      });
      const hospitalBreakdown = Array.from(hospitalCountMap.entries()).map(([name, count]) => ({
        name: name.replace(/,.*$/, ''),
        count,
      }));

      // Time slot breakdown
      let morning = 0;
      let afternoon = 0;
      let evening = 0;
      appointments.forEach((a) => {
        if (a.status !== 'CANCELLED') {
          const h = new Date(a.startsAt).getHours();
          if (h < 12) morning++;
          else if (h < 16) afternoon++;
          else evening++;
        }
      });
      const timeSlotBreakdown = [
        { slot: 'Morning (09:00 - 12:00)', count: morning },
        { slot: 'Afternoon (12:00 - 16:00)', count: afternoon },
        { slot: 'Evening (16:00 - 20:00)', count: evening },
      ];

      // Summary KPIs
      const todayDate = new Date();
      const todayAppts = appointments.filter((a) => {
        const ad = new Date(a.startsAt);
        return (
          ad.getFullYear() === todayDate.getFullYear() &&
          ad.getMonth() === todayDate.getMonth() &&
          ad.getDate() === todayDate.getDate()
        );
      });

      const next24hTime = Date.now() + 24 * 3600_000;
      const next24hAppts = appointments.filter((a) => {
        const t = new Date(a.startsAt).getTime();
        return t >= Date.now() && t <= next24hTime && a.status !== 'CANCELLED';
      });

      const next24hRemindersSent = notificationLogs.filter(
        (l) => l.type === 'REMINDER_24H' && (l.status === 'SENT' || l.status === 'SIMULATED')
      ).length;

      const upcoming7DaysAppts = appointments.filter((a) => {
        const t = new Date(a.startsAt).getTime();
        return t >= Date.now() && t <= Date.now() + 7 * 86400_000 && a.status !== 'CANCELLED';
      });

      const totalCompleted = appointments.filter((a) => a.status === 'COMPLETED').length;
      const totalPast = appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'NO_SHOW').length;
      const completionRate = totalPast > 0 ? Math.round((totalCompleted / totalPast) * 100) : 92;

      return sendJson(200, {
        data: {
          summary: {
            todayCount: todayAppts.length,
            next24hCount: next24hAppts.length,
            next24hRemindersSent,
            upcoming7DaysCount: upcoming7DaysAppts.length,
            completionRate,
            notificationProvider: process.env.NOTIFICATION_PROVIDER || 'console',
          },
          dailyLoads,
          upcomingVolume,
          hospitalBreakdown,
          timeSlotBreakdown,
        },
      });
    }

    // Hospitals
    if (pathname === '/api/hospitals' && req.method === 'GET') {
      const query = url.searchParams.get('q')?.toLowerCase() || '';
      const type = url.searchParams.get('type');
      let filtered = hospitalsList;
      if (query) {
        filtered = filtered.filter(
          (h) =>
            h.name.toLowerCase().includes(query) ||
            h.address?.toLowerCase().includes(query) ||
            h.keySpecialties.some((s: string) => s.toLowerCase().includes(query))
        );
      }
      if (type) {
        filtered = filtered.filter((h) => h.type === type);
      }
      return sendJson(200, {
        data: filtered,
        pagination: { page: 1, pageSize: 100, total: filtered.length, totalPages: 1 },
      });
    }

    if (pathname === '/api/hospitals' && req.method === 'POST') {
      const body = await parseBody();
      const slug = (body.name || 'new-hospital').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newHosp = {
        id: slug,
        slug,
        name: body.name || 'New Hospital',
        type: body.type || 'PRIVATE',
        address: body.address || 'Bangalore, India',
        latitude: 12.9716,
        longitude: 77.5946,
        contact: '+91-80-00000000',
        website: null,
        accreditation: ['NABH'],
        hasEmergency: true,
        beds: 100,
        bedsNote: null,
        keySpecialties: ['General Medicine'],
        dataVerified: false,
        departments: [{ id: 'general-medicine', name: 'General Medicine' }],
      };
      hospitalsList.unshift(newHosp);
      hospitalsMap.set(slug, newHosp);
      return sendJson(201, { data: newHosp });
    }

    const hospMatch = pathname.match(/^\/api\/hospitals\/([^/]+)$/);
    if (hospMatch && req.method === 'GET') {
      const id = hospMatch[1];
      const found = hospitalsMap.get(id) || hospitalsList.find((h) => h.id === id || h.slug === id);
      if (!found) return sendJson(404, { error: { code: 'NOT_FOUND', message: 'Hospital not found' } });
      return sendJson(200, { data: found });
    }

    if (hospMatch && req.method === 'PUT') {
      const id = hospMatch[1];
      const body = await parseBody();
      const found = hospitalsMap.get(id);
      if (found) {
        Object.assign(found, body);
        return sendJson(200, { data: found });
      }
      return sendJson(404, { error: { code: 'NOT_FOUND', message: 'Hospital not found' } });
    }

    // Doctors
    if (pathname === '/api/doctors' && req.method === 'GET') {
      const specialty = url.searchParams.get('specialty')?.toLowerCase() || '';
      const hospital = url.searchParams.get('hospital')?.toLowerCase() || '';
      const language = url.searchParams.get('language')?.toLowerCase() || '';
      const search = url.searchParams.get('search')?.toLowerCase() || '';

      let filtered = doctorsList;
      if (specialty) {
        filtered = filtered.filter((d) => d.specialty.toLowerCase().includes(specialty));
      }
      if (hospital) {
        filtered = filtered.filter((d) =>
          d.affiliations?.some(
            (a: any) =>
              a.hospital.slug.includes(hospital) ||
              a.hospital.name.toLowerCase().includes(hospital)
          )
        );
      }
      if (language) {
        filtered = filtered.filter((d) =>
          d.languages.some((l: string) => l.toLowerCase().includes(language))
        );
      }
      if (search) {
        filtered = filtered.filter(
          (d) =>
            d.name.toLowerCase().includes(search) ||
            d.specialty.toLowerCase().includes(search) ||
            d.qualifications.toLowerCase().includes(search)
        );
      }

      return sendJson(200, {
        data: filtered,
        pagination: { page: 1, pageSize: 100, total: filtered.length, totalPages: 1 },
      });
    }

    const docAvailMatch = pathname.match(/^\/api\/doctors\/([^/]+)\/availability$/);
    if (docAvailMatch && req.method === 'GET') {
      const docId = docAvailMatch[1];
      const doc = doctorsMap.get(docId) || doctorsList.find((d) => d.id === docId);
      const reqHospitalId = url.searchParams.get('hospitalId');
      const slots: any[] = [];

      if (doc) {
        const affs = reqHospitalId
          ? doc.affiliations.filter((a: any) => a.hospitalId === reqHospitalId || a.hospital.slug === reqHospitalId)
          : doc.affiliations;

        for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
          const targetDate = new Date(now.getTime() + dayOffset * 86400000);
          const dayOfWeek = targetDate.getDay();

          for (const aff of affs) {
            const rules = (aff.availabilityRules || []).filter((r: any) => r.dayOfWeek === dayOfWeek);
            for (const rule of rules) {
              const [startH, startM] = rule.startTime.split(':').map(Number);
              const [endH, endM] = rule.endTime.split(':').map(Number);
              const step = rule.slotMinutes || 20;

              let curM = startH * 60 + startM;
              const maxM = endH * 60 + endM;

              while (curM + step <= maxM) {
                const sH = Math.floor(curM / 60);
                const sMin = curM % 60;
                const eH = Math.floor((curM + step) / 60);
                const eMin = (curM + step) % 60;

                const startsAt = new Date(targetDate);
                startsAt.setHours(sH, sMin, 0, 0);

                const endsAt = new Date(targetDate);
                endsAt.setHours(eH, eMin, 0, 0);

                const isBooked = appointments.some(
                  (a) =>
                    a.status !== 'CANCELLED' &&
                    a.doctorId === doc.id &&
                    new Date(a.startsAt).getTime() === startsAt.getTime()
                );

                if (!isBooked) {
                  slots.push({
                    affiliationId: aff.id,
                    hospitalId: aff.hospitalId,
                    startsAt: startsAt.toISOString(),
                    endsAt: endsAt.toISOString(),
                  });
                }

                curM += step;
              }
            }
          }
        }
      }

      return sendJson(200, { data: slots });
    }

    const docMatch = pathname.match(/^\/api\/doctors\/([^/]+)$/);
    if (docMatch && req.method === 'GET') {
      const id = docMatch[1];
      const found = doctorsMap.get(id) || doctorsList.find((d) => d.id === id);
      if (!found) return sendJson(404, { error: { code: 'NOT_FOUND', message: 'Doctor not found' } });
      return sendJson(200, { data: found });
    }

    // Doctor portal
    if (pathname === '/api/doctors/me/availability' && req.method === 'GET') {
      return sendJson(200, { data: primaryDoc.affiliations || [] });
    }

    if (pathname === '/api/doctors/me/availability' && req.method === 'PUT') {
      const body = await parseBody();
      const targetAff = primaryDoc.affiliations?.find((a: any) => a.hospitalId === body.hospitalId);
      if (targetAff) {
        targetAff.availabilityRules = body.rules || [];
      }
      return sendJson(200, { data: primaryDoc.affiliations || [] });
    }

    if (pathname === '/api/doctors/me/time-off' && req.method === 'GET') {
      return sendJson(200, { data: timeOffList });
    }

    if (pathname === '/api/doctors/me/time-off' && req.method === 'POST') {
      const body = await parseBody();
      const newOff = {
        id: `toff-${Date.now()}`,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        reason: body.reason || null,
      };
      timeOffList.push(newOff);
      return sendJson(201, { data: newOff, conflictingActiveAppointments: 0 });
    }

    // Appointments
    if (pathname === '/api/appointments' && req.method === 'GET') {
      return sendJson(200, {
        data: appointments,
        pagination: { page: 1, pageSize: 100, total: appointments.length, totalPages: 1 },
      });
    }

    if (pathname === '/api/appointments' && req.method === 'POST') {
      const body = await parseBody();
      const doc = doctorsMap.get(body.doctorId) || primaryDoc;
      const aff = doc?.affiliations?.find((a: any) => a.id === body.affiliationId || a.hospitalId === body.hospitalId) || doc?.affiliations?.[0];
      const startsAt = body.startsAt || new Date(Date.now() + 86400000).toISOString();
      const endsAt = new Date(new Date(startsAt).getTime() + 20 * 60000).toISOString();

      const newAppt = {
        id: `appt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patientId: currentUser.id,
        doctorId: doc?.id || body.doctorId,
        affiliationId: aff?.id || body.affiliationId,
        startsAt,
        endsAt,
        status: 'CONFIRMED',
        reason: body.reason || 'General Medical Consultation',
        patient: {
          name: 'Patient User',
          email: currentUser.email || 'patient@example.test',
          phone: '+91-98800-11222',
        },
        doctor: {
          id: doc?.id || body.doctorId,
          name: doc?.name || 'Dr. Specialist',
          specialty: doc?.specialty || 'General Medicine',
        },
        affiliation: {
          hospital: {
            id: aff?.hospital?.id || body.hospitalId || 'apollo-hospital-bannerghatta-road',
            name: aff?.hospital?.name || 'Apollo Hospital, Bannerghatta Road',
          },
        },
      };

      appointments.unshift(newAppt);
      return sendJson(201, { data: newAppt });
    }

    const cancelMatch = pathname.match(/^\/api\/appointments\/([^/]+)\/cancel$/);
    if (cancelMatch && req.method === 'PATCH') {
      const id = cancelMatch[1];
      const appt = appointments.find((a) => a.id === id);
      if (appt) {
        appt.status = 'CANCELLED';
        return sendJson(200, { data: appt });
      }
      return sendJson(404, { error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    }

    const reschedMatch = pathname.match(/^\/api\/appointments\/([^/]+)\/reschedule$/);
    if (reschedMatch && req.method === 'PATCH') {
      const id = reschedMatch[1];
      const body = await parseBody();
      const appt = appointments.find((a) => a.id === id);
      if (appt) {
        appt.startsAt = body.startsAt;
        appt.endsAt = new Date(new Date(body.startsAt).getTime() + 20 * 60000).toISOString();
        return sendJson(200, { data: appt });
      }
      return sendJson(404, { error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    }

    const statusMatch = pathname.match(/^\/api\/appointments\/([^/]+)\/status$/);
    if (statusMatch && req.method === 'PATCH') {
      const id = statusMatch[1];
      const body = await parseBody();
      const appt = appointments.find((a) => a.id === id);
      if (appt) {
        appt.status = body.status;
        return sendJson(200, { data: appt });
      }
      return sendJson(404, { error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    }

    // Consents
    if (pathname === '/api/consents' && req.method === 'GET') {
      return sendJson(200, { data: consents });
    }

    if (pathname === '/api/consents' && req.method === 'POST') {
      const body = await parseBody();
      const newConsent = {
        id: `c-${Date.now()}`,
        purpose: body.purpose,
        policyVersion: '1.0',
        grantedAt: new Date().toISOString(),
        withdrawnAt: null,
      };
      consents.push(newConsent);
      return sendJson(201, { data: newConsent });
    }

    const consentDelMatch = pathname.match(/^\/api\/consents\/([^/]+)$/);
    if (consentDelMatch && req.method === 'DELETE') {
      const purpose = consentDelMatch[1];
      const c = consents.find((x) => x.purpose === purpose);
      if (c) c.withdrawnAt = new Date().toISOString();
      return sendJson(200, { data: { ok: true } });
    }

    // Patient Medical Records: Timeline of past diagnoses, allergies, and vaccinations
    if (pathname === '/api/patient/medical-records' && req.method === 'GET') {
      const completedAppts = appointments.filter((a) => a.status === 'COMPLETED');

      const sampleClinicalEvents = [
        {
          diagnosis: 'Essential Hypertension (Stage 1)',
          icdCode: 'I10',
          clinicalNotes: 'Elevated systolic BP recorded on routine visit. Advised DASH diet (<2g sodium/day), 30 minutes daily aerobic exercise, and weekly BP tracking.',
          vitals: { bloodPressure: '138/88 mmHg', heartRate: '76 bpm', temperature: '98.4 °F', spO2: '99%', weightKg: 72 },
          medications: [
            { name: 'Amlodipine Besylate', dosage: '5 mg', frequency: 'Once daily (morning)', duration: '30 days', instructions: 'Take with a glass of water after breakfast' },
            { name: 'Telmisartan', dosage: '40 mg', frequency: 'Once daily (morning)', duration: '30 days', instructions: 'Monitor for mild dizziness' },
          ],
          status: 'CHRONIC',
          followUpDate: '2026-10-15',
        },
        {
          diagnosis: 'Type 2 Diabetes Mellitus with Good Glycemic Control',
          icdCode: 'E11.9',
          clinicalNotes: 'HbA1c steady at 6.8%. Fasting glucose 112 mg/dL. Retinal exam and microalbuminuria tests normal. Continue metformin with meals.',
          vitals: { bloodPressure: '124/80 mmHg', heartRate: '72 bpm', temperature: '98.6 °F', spO2: '98%', weightKg: 71.5 },
          medications: [
            { name: 'Metformin Hydrochloride (Extended Release)', dosage: '500 mg', frequency: 'Twice daily with meals', duration: '60 days', instructions: 'Take during or immediately after meals' },
            { name: 'Methylcobalamin (Vitamin B12)', dosage: '1500 mcg', frequency: 'Once daily after lunch', duration: '30 days', instructions: 'Nutritional nerve support' },
          ],
          status: 'CHRONIC',
          followUpDate: '2026-11-20',
        },
        {
          diagnosis: 'Acute Viral Pharyngitis & Upper Respiratory Infection',
          icdCode: 'J02.9',
          clinicalNotes: 'Presented with 3 days of odynophagia, dry cough, and low-grade fever. Rapid antigen test negative for influenza. Symptomatic care advised.',
          vitals: { bloodPressure: '118/76 mmHg', heartRate: '82 bpm', temperature: '99.8 °F', spO2: '98%', weightKg: 72 },
          medications: [
            { name: 'Paracetamol', dosage: '650 mg', frequency: 'Every 8 hours as needed', duration: '5 days', instructions: 'Do not exceed 3g/day' },
            { name: 'Cetirizine Hydrochloride', dosage: '10 mg', frequency: 'Once daily at bedtime', duration: '5 days', instructions: 'May cause mild drowsiness' },
            { name: 'Warm Saline Gargles', dosage: '3 times daily', frequency: 'Daily', duration: '7 days', instructions: '1/2 tsp salt in warm water' },
          ],
          status: 'RESOLVED',
          followUpDate: undefined,
        },
        {
          diagnosis: 'Degenerative Lumbar Spondylosis (L4-L5)',
          icdCode: 'M47.816',
          clinicalNotes: 'Mechanical low back ache following extended desktop work. Lumbar spine imaging shows mild L4-L5 disc desiccation without radicular deficit. Core strengthening advised.',
          vitals: { bloodPressure: '122/82 mmHg', heartRate: '74 bpm', temperature: '98.2 °F', spO2: '99%', weightKg: 72.8 },
          medications: [
            { name: 'Aceclofenac + Paracetamol', dosage: '100 mg / 325 mg', frequency: 'Twice daily after meals for acute pain', duration: '5 days', instructions: 'Take with milk or antacid if heartburn occurs' },
            { name: 'Thiocolchicoside (Muscle Relaxant)', dosage: '4 mg', frequency: 'Twice daily', duration: '5 days', instructions: 'Take after meals' },
          ],
          status: 'FOLLOW_UP_REQUIRED',
          followUpDate: '2026-10-05',
        },
      ];

      const diagnoses: any[] = [];
      const count = Math.max(completedAppts.length, sampleClinicalEvents.length);

      for (let i = 0; i < count; i++) {
        const appt = completedAppts[i % completedAppts.length];
        const sampleEvent = sampleClinicalEvents[i % sampleClinicalEvents.length];
        const linkedRx = rawPrescriptions.find((p: any) => p.appointment_id === appt?.id);

        const dateStr = appt ? appt.startsAt.slice(0, 10) : new Date(Date.now() - (i + 1) * 21 * 86400000).toISOString().slice(0, 10);
        const docName = appt?.doctor?.name || primaryDoc.name;
        const docSpecialty = appt?.doctor?.specialty || primaryDoc.specialty;
        const hospName = appt?.affiliation?.hospital?.name || 'Apollo Hospital, Bannerghatta Road';

        diagnoses.push({
          id: `diag-${appt?.id || i + 1}`,
          appointmentId: appt?.id || `appt-comp-${i + 1}`,
          date: dateStr,
          diagnosis: linkedRx?.diagnosis || sampleEvent.diagnosis,
          icdCode: sampleEvent.icdCode,
          doctorName: docName,
          doctorSpecialty: docSpecialty,
          hospitalName: hospName,
          hospitalBranch: 'Bangalore Facility',
          clinicalNotes: linkedRx?.notes || sampleEvent.clinicalNotes,
          vitals: sampleEvent.vitals,
          medications: (linkedRx?.medications && linkedRx.medications.length > 0) ? linkedRx.medications : sampleEvent.medications,
          status: sampleEvent.status,
          followUpDate: sampleEvent.followUpDate,
        });
      }

      // Sort chronological descending
      diagnoses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return sendJson(200, {
        data: {
          patient: {
            id: currentUser.id || 'pat-001',
            name: 'Aarav Sharma',
            email: currentUser.email || 'patient@example.test',
            phone: '+91-98801-11223',
            bloodGroup: 'O+ Positive',
            dob: '1988-06-14',
            gender: 'Male',
            area: 'HSR Layout, Bangalore',
            emergencyContact: {
              name: 'Sunita Sharma',
              relation: 'Spouse',
              phone: '+91-98801-99887',
            },
          },
          diagnoses,
          allergies: patientAllergies,
          vaccinations: patientVaccinations,
        },
      });
    }

    if (pathname === '/api/patient/allergies' && req.method === 'POST') {
      const body = await parseBody();
      const newAllergy = {
        id: `alg-${Date.now()}`,
        allergen: body.allergen || 'New Allergen',
        category: body.category || 'OTHER',
        severity: body.severity || 'MODERATE',
        reaction: body.reaction || 'Adverse physical reaction',
        diagnosedAt: body.diagnosedAt || new Date().toISOString().slice(0, 10),
        status: 'ACTIVE',
        notes: body.notes || '',
      };
      patientAllergies.unshift(newAllergy);
      return sendJson(201, { data: newAllergy });
    }

    if (pathname === '/api/patient/vaccinations' && req.method === 'POST') {
      const body = await parseBody();
      const newVac = {
        id: `vac-${Date.now()}`,
        vaccineName: body.vaccineName || 'Vaccine',
        targetDisease: body.targetDisease || 'Infectious Disease',
        dose: body.dose || 'Booster Dose',
        administeredDate: body.administeredDate || new Date().toISOString().slice(0, 10),
        facility: body.facility || 'Bangalore Healthcare Facility',
        batchNumber: body.batchNumber || `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
        nextDueDate: body.nextDueDate || null,
        status: 'COMPLETED',
        notes: body.notes || '',
      };
      patientVaccinations.unshift(newVac);
      return sendJson(201, { data: newVac });
    }

    // AI Symptom Guide
    if (pathname === '/api/ai/symptom-guide' && req.method === 'POST') {
      const body = await parseBody();
      const sym = (body.symptoms || '').toLowerCase();

      let specialties = ['General Medicine'];
      let urgency = 'ROUTINE';
      let nextStep = 'Book a regular consultation with a doctor';

      if (sym.includes('chest') || sym.includes('heart') || sym.includes('palpitation') || sym.includes('angina')) {
        specialties = ['Cardiology', 'Emergency'];
        urgency = sym.includes('severe') || sym.includes('shortness of breath') ? 'EMERGENT' : 'URGENT';
        nextStep = urgency === 'EMERGENT' ? 'Visit emergency care immediately or call 112' : 'Consult a cardiologist within 24-48 hours';
      } else if (sym.includes('headache') || sym.includes('seizure') || sym.includes('dizzy') || sym.includes('numb')) {
        specialties = ['Neurology'];
        urgency = sym.includes('severe') ? 'URGENT' : 'ROUTINE';
        nextStep = 'Schedule an appointment with a neurologist';
      } else if (sym.includes('bone') || sym.includes('fracture') || sym.includes('joint') || sym.includes('knee') || sym.includes('back pain')) {
        specialties = ['Orthopedics'];
        urgency = sym.includes('swelling') || sym.includes('severe') ? 'URGENT' : 'ROUTINE';
        nextStep = 'Schedule an orthopedic evaluation';
      } else if (sym.includes('lump') || sym.includes('tumor') || sym.includes('weight loss')) {
        specialties = ['Oncology'];
        urgency = 'URGENT';
        nextStep = 'Consult an oncologist for diagnostic screening';
      } else if (sym.includes('fever') || sym.includes('cough') || sym.includes('cold') || sym.includes('throat')) {
        specialties = ['General Medicine', 'Pulmonology'];
        urgency = 'ROUTINE';
        nextStep = 'Book an OPD consultation or tele-consult';
      }

      return sendJson(200, {
        data: {
          specialties,
          urgency,
          nextStep,
          disclaimer: 'AI guidance is for informational triage and not a diagnosis. For emergencies, visit the nearest hospital or call 112.',
        },
      });
    }

    // Admin Reports
    if (pathname === '/api/admin/reports/bookings' && req.method === 'GET') {
      return sendJson(200, {
        data: {
          total: appointments.length + 38,
          byDay: { Mon: 8, Tue: 14, Wed: 12, Thu: 10, Fri: 16, Sat: 9 },
          byStatus: { CONFIRMED: 32, PENDING: 4, CANCELLED: 2 },
          byHospital: {
            'Apollo Hospital': 16,
            'Fortis Hospital': 12,
            'HCG Cancer Center': 10,
          },
          bySpecialty: {
            Cardiology: 15,
            Oncology: 11,
            Neurology: 8,
            Orthopedics: 4,
          },
        },
      });
    }

    if (pathname === '/api/admin/users' && req.method === 'GET') {
      return sendJson(200, {
        data: [
          { id: 'u-admin', email: 'admin@example.test', role: 'ADMIN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'u-doctor', email: 'priya.kapoor@example.test', role: 'DOCTOR', isActive: true, createdAt: '2026-01-15T00:00:00.000Z' },
          { id: 'u-patient', email: 'patient@example.test', role: 'PATIENT', isActive: true, createdAt: '2026-02-01T00:00:00.000Z' },
        ],
        pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
      });
    }

    if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
      return sendJson(200, {
        data: [],
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
      });
    }

    const userRoleMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/role$/);
    if (userRoleMatch && req.method === 'PATCH') {
      const body = await parseBody();
      return sendJson(200, { data: { id: userRoleMatch[1], role: body.role } });
    }

    // Default fallback
    return sendJson(404, { error: { code: 'NOT_FOUND', message: `Route ${pathname} not found` } });
  };
}
