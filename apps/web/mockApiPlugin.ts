import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawHospital {
  slug: string;
  name: string;
  type: 'PRIVATE' | 'GOVERNMENT';
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  departments: string[];
  contact: string | null;
  website: string | null;
  accreditation: string[];
  hasEmergency: boolean;
  beds: number | null;
  bedsNote: string | null;
  keySpecialties: string[];
  dataVerified: boolean;
}

interface RawDoctor {
  name: string;
  specialty: string;
  qualifications: string;
  department: string;
  languages: string[];
  contactEmail: string | null;
  photoUrl: string | null;
  isDemo: boolean;
  isVerified: boolean;
  demoLoginEmail: string;
  affiliations: {
    hospitalSlug: string;
    schedulePending: boolean;
    availabilityRules: { dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number }[];
  }[];
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
  const hospitalsPath = path.join(rootDir, 'seed', 'hospitals.json');
  const doctorsPath = path.join(rootDir, 'seed', 'doctors.json');

  let rawHospitals: RawHospital[] = [];
  let rawDoctors: RawDoctor[] = [];

  try {
    if (fs.existsSync(hospitalsPath)) {
      rawHospitals = JSON.parse(fs.readFileSync(hospitalsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to load seed/hospitals.json:', err);
  }

  try {
    if (fs.existsSync(doctorsPath)) {
      rawDoctors = JSON.parse(fs.readFileSync(doctorsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to load seed/doctors.json:', err);
  }

  const hospitalsMap = new Map<string, any>();
  const hospitalsList = rawHospitals.map((h, i) => {
    const item = {
      id: h.slug,
      slug: h.slug,
      name: h.name,
      type: h.type,
      address: h.address,
      latitude: h.latitude,
      longitude: h.longitude,
      contact: h.contact,
      website: h.website,
      accreditation: h.accreditation || [],
      hasEmergency: !!h.hasEmergency,
      beds: h.beds,
      bedsNote: h.bedsNote,
      keySpecialties: h.keySpecialties || [],
      dataVerified: h.dataVerified ?? true,
      departments: (h.departments || []).map((d) => ({
        id: d.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: d,
      })),
    };
    hospitalsMap.set(item.id, item);
    hospitalsMap.set(item.slug, item);
    return item;
  });

  const doctorsMap = new Map<string, any>();
  const doctorsList = rawDoctors.map((d, i) => {
    const docId = `doc-${i + 1}`;
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

    const item = {
      id: docId,
      name: d.name,
      specialty: d.specialty,
      qualifications: d.qualifications,
      languages: d.languages || ['English'],
      contactEmail: d.contactEmail,
      photoUrl: d.photoUrl,
      isDemo: d.isDemo ?? true,
      isVerified: d.isVerified ?? false,
      affiliations,
    };
    doctorsMap.set(docId, item);
    return item;
  });

  let currentUser = {
    id: 'user-patient-1',
    email: 'patient@example.test',
    role: 'PATIENT',
  };

  const appointments: any[] = [
    {
      id: 'appt-demo-1',
      patientId: 'user-patient-1',
      doctorId: doctorsList[0]?.id || 'doc-1',
      affiliationId: doctorsList[0]?.affiliations[0]?.id || 'aff-doc-1-1',
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 86400000 + 20 * 60000).toISOString(),
      status: 'CONFIRMED',
      reason: 'Routine cardiology checkup',
      doctor: {
        id: doctorsList[0]?.id || 'doc-1',
        name: doctorsList[0]?.name || 'Dr. Priya Kapoor',
        specialty: doctorsList[0]?.specialty || 'Cardiology',
      },
      affiliation: {
        hospital: {
          id: doctorsList[0]?.affiliations[0]?.hospital?.id || 'apollo-hospital-bannerghatta-road',
          name: doctorsList[0]?.affiliations[0]?.hospital?.name || 'Apollo Hospital, Bannerghatta Road',
        },
      },
    },
  ];

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
      const email = body.email || 'patient@example.test';
      let role = 'PATIENT';
      if (email.includes('admin')) role = 'ADMIN';
      else if (email.includes('doctor') || email.includes('priya') || email.includes('rajesh')) role = 'DOCTOR';
      currentUser = { id: `user-${Date.now()}`, email, role };
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

        // Generate slots for next 5 days
        const now = new Date();
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
      const doc = doctorsList[0];
      return sendJson(200, { data: doc?.affiliations || [] });
    }

    if (pathname === '/api/doctors/me/time-off' && req.method === 'GET') {
      return sendJson(200, { data: [] });
    }

    // Appointments
    if (pathname === '/api/appointments' && req.method === 'GET') {
      return sendJson(200, {
        data: appointments,
        pagination: { page: 1, pageSize: 50, total: appointments.length, totalPages: 1 },
      });
    }

    if (pathname === '/api/appointments' && req.method === 'POST') {
      const body = await parseBody();
      const doc = doctorsMap.get(body.doctorId) || doctorsList[0];
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
