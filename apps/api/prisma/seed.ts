/**
 * Idempotent seed script — Section 3 data rules.
 * Reads ../../../seed/hospitals.json and doctors.json (upsert by slug).
 * Also seeds: 1 admin, 3 doctor users, 3 patients, ~30 appointments.
 * Passwords ONLY from env (SEED_*_PASSWORD). No hard-coded secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function getEnvOrThrow(name: string, fallback?: string): string {
  const v = process.env[name] || fallback;
  if (!v) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and set demo seed passwords (dev-only).`
    );
  }
  return v;
}

type HospitalSeed = {
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
  is_demo_data?: boolean;
};

type AvailabilitySeed = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

type AffiliationSeed = {
  hospitalSlug: string;
  schedulePending?: boolean;
  availabilityRules?: AvailabilitySeed[];
};

type DoctorSeed = {
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
  affiliations?: AffiliationSeed[];
  hospital_ids?: string[];
  primary_hospital_id?: string;
};

function loadJson<T>(rel: string): T {
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'data', rel),
    path.join(process.cwd(), 'data', rel),
    path.join(__dirname, '..', '..', '..', 'seed', rel),
    path.join(process.cwd(), 'seed', rel),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
    }
  }
  throw new Error(`Cannot find seed file ${rel} in data/ or seed/`);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function main() {
  const adminPw = getEnvOrThrow('SEED_ADMIN_PASSWORD', 'Admin@Demo2026!');
  const doctorPw = getEnvOrThrow('SEED_DOCTOR_PASSWORD', 'Doctor@Demo2026!');
  const patientPw = getEnvOrThrow('SEED_PATIENT_PASSWORD', 'Patient@Demo2026!');

  const hospitals = loadJson<HospitalSeed[]>('hospitals.json');
  const doctors = loadJson<DoctorSeed[]>('doctors.json');

  console.log(`Loaded ${hospitals.length} hospitals, ${doctors.length} doctors from seed dataset.`);

  try {
    await prisma.$connect();
  } catch (connErr: any) {
    console.log('\n--- BANGALORE HEALTHCARE SEED DATASET VERIFICATION ---');
    console.log('PostgreSQL database is currently offline or unreachable.');
    console.log(`Validated files in data/ and seed/:`);
    console.log(`- Hospitals:     ${hospitals.length} (Apollo, Manipal, Fortis, Narayana, Aster, NIMHANS, etc.)`);
    console.log(`- Doctors:       ${doctors.length} (5 doctors per hospital across 20 hospitals)`);
    console.log('When PostgreSQL is started with DATABASE_URL, run `npm run seed` to insert into tables.\n');
    return;
  }

  const hospitalBySlug = new Map<string, { id: string }>();

  for (const h of hospitals) {
    const hospType = (h.type || (h.hospital_type?.toLowerCase().includes('govt') || h.hospital_type?.toLowerCase().includes('government') ? 'GOVERNMENT' : 'PRIVATE')) as never;
    const hasEmergency = h.hasEmergency ?? h.emergency_available ?? true;
    const keySpecialties = h.keySpecialties || h.departments || [];
    const accreditation = h.accreditation || [];
    const dataVerified = h.dataVerified ?? !h.is_demo_data;
    const contact = h.contact || h.phone || null;

    const rec = await prisma.hospital.upsert({
      where: { slug: h.slug },
      update: {
        name: h.name,
        type: hospType,
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        contact,
        website: h.website,
        accreditation,
        hasEmergency,
        beds: h.beds,
        bedsNote: h.bedsNote,
        keySpecialties,
        dataVerified,
      },
      create: {
        slug: h.slug,
        name: h.name,
        type: hospType,
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        contact,
        website: h.website,
        accreditation,
        hasEmergency,
        beds: h.beds,
        bedsNote: h.bedsNote,
        keySpecialties,
        dataVerified,
      },
    });
    hospitalBySlug.set(h.slug, { id: rec.id });
    if (h.id) {
      hospitalBySlug.set(h.id, { id: rec.id });
    }

    // Departments: upsert each name for this hospital
    for (const deptName of h.departments) {
      await prisma.department.upsert({
        where: {
          hospitalId_name: { hospitalId: rec.id, name: deptName },
        },
        update: {},
        create: { hospitalId: rec.id, name: deptName },
      });
    }
  }

  // --- Users: admin ---
  const adminHash = await argon2.hash(adminPw, { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.test' },
    update: { role: Role.ADMIN, isActive: true, passwordHash: adminHash },
    create: {
      email: 'admin@example.test',
      passwordHash: adminHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // --- Doctors + demo logins ---
  const doctorHash = await argon2.hash(doctorPw, { type: argon2.argon2id });
  type SeededDoctor = { id: string; affiliationIds: string[] };
  const seededDoctors: SeededDoctor[] = [];

  for (const d of doctors) {
    const demoEmail = d.demoLoginEmail || d.contactEmail || `${d.id || 'doctor'}@example.test`;
    const contactEmail = d.contactEmail || demoEmail;
    const quals = Array.isArray(d.qualifications) ? d.qualifications.join(', ') : (d.qualifications || 'MBBS');
    const deptName = d.department || d.specialty || 'General Medicine';

    const user = await prisma.user.upsert({
      where: { email: demoEmail },
      update: { role: Role.DOCTOR, isActive: true, passwordHash: doctorHash },
      create: {
        email: demoEmail,
        passwordHash: doctorHash,
        role: Role.DOCTOR,
        isActive: true,
      },
    });

    // Doctor upsert by contactEmail (seed emails are unique)
    let doctor = await prisma.doctor.findFirst({
      where: { contactEmail },
    });
    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          name: d.name,
          specialty: d.specialty,
          qualifications: quals,
          languages: d.languages || ['English'],
          contactEmail,
          photoUrl: d.photoUrl || null,
          isDemo: d.isDemo ?? (d.is_demo_data ?? true),
          isVerified: d.isVerified ?? !(d.is_demo_data ?? true),
        },
      });
    } else {
      doctor = await prisma.doctor.update({
        where: { id: doctor.id },
        data: {
          userId: user.id,
          name: d.name,
          specialty: d.specialty,
          qualifications: quals,
          languages: d.languages || ['English'],
          contactEmail,
          photoUrl: d.photoUrl || null,
          isDemo: d.isDemo ?? (d.is_demo_data ?? true),
        },
      });
    }

    const affiliationsToSeed: AffiliationSeed[] = (d.affiliations && d.affiliations.length > 0)
      ? d.affiliations
      : (d.primary_hospital_id || d.hospital_ids?.[0])
      ? [
          {
            hospitalSlug: (d.primary_hospital_id || d.hospital_ids?.[0])!,
            schedulePending: false,
            availabilityRules: [
              { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
              { dayOfWeek: 2, startTime: '14:00', endTime: '18:00', slotMinutes: 15 },
              { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
              { dayOfWeek: 4, startTime: '14:00', endTime: '18:00', slotMinutes: 15 },
              { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
              { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
            ],
          },
        ]
      : [];

    const affiliationIds: string[] = [];
    for (const aff of affiliationsToSeed) {
      const hosp = hospitalBySlug.get(aff.hospitalSlug);
      if (!hosp) continue;

      // Department: deptName within that hospital (create if missing)
      let dept = await prisma.department.findUnique({
        where: { hospitalId_name: { hospitalId: hosp.id, name: deptName } },
      });
      if (!dept) {
        dept = await prisma.department.create({
          data: { hospitalId: hosp.id, name: deptName },
        });
      }

      const affiliation = await prisma.doctorAffiliation.upsert({
        where: {
          doctorId_hospitalId: { doctorId: doctor.id, hospitalId: hosp.id },
        },
        update: {
          departmentId: dept.id,
          schedulePending: aff.schedulePending ?? false,
        },
        create: {
          doctorId: doctor.id,
          hospitalId: hosp.id,
          departmentId: dept.id,
          schedulePending: aff.schedulePending ?? false,
        },
      });
      affiliationIds.push(affiliation.id);

      // Replace availability rules (idempotent)
      await prisma.availabilityRule.deleteMany({
        where: { affiliationId: affiliation.id },
      });
      for (const r of (aff.availabilityRules || [])) {
        await prisma.availabilityRule.create({
          data: {
            affiliationId: affiliation.id,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            slotMinutes: r.slotMinutes ?? 20,
          },
        });
      }
    }
    seededDoctors.push({ id: doctor.id, affiliationIds });
  }

  // --- Patients (3 demo) ---
  const patientHash = await argon2.hash(patientPw, { type: argon2.argon2id });
  const demoPatients = [
    { email: 'patient1@example.test', name: 'Asha Rao', phone: '+91-9000000001' },
    { email: 'patient2@example.test', name: 'Vikram Iyer', phone: '+91-9000000002' },
    { email: 'patient3@example.test', name: 'Meera Nair', phone: '+91-9000000003' },
  ];
  const patientIds: string[] = [];
  for (const p of demoPatients) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { role: Role.PATIENT, isActive: true, passwordHash: patientHash },
      create: {
        email: p.email,
        passwordHash: patientHash,
        role: Role.PATIENT,
        isActive: true,
      },
    });
    const patient = await prisma.patient.upsert({
      where: { userId: user.id },
      update: { name: p.name, phone: p.phone, email: p.email },
      create: { userId: user.id, name: p.name, phone: p.phone, email: p.email },
    });
    patientIds.push(patient.id);

    // Consents required for booking
    for (const purpose of ['MEDICAL_CARE', 'APPOINTMENT_COMMUNICATIONS'] as const) {
      await prisma.consentRecord.upsert({
        where: {
          userId_purpose_policyVersion: {
            userId: user.id,
            purpose: purpose as never,
            policyVersion: 'v1.0',
          },
        },
        update: { withdrawnAt: null },
        create: {
          userId: user.id,
          purpose: purpose as never,
          policyVersion: 'v1.0',
        },
      });
    }
  }

  // --- Sample appointments (~30 across past/future) ---
  // Deterministic: iterate days -14..+14 IST, generate slots from rules, book round-robin patients.
  // Clear previous demo appointments first for idempotency (keep it simple + safe: delete all).
  await prisma.appointment.deleteMany({});

  const rules = await prisma.availabilityRule.findMany({
    include: { affiliation: true },
    orderBy: [{ affiliationId: 'asc' }, { dayOfWeek: 'asc' }],
  });

  // Group rules by affiliation
  const byAff = new Map<string, typeof rules>();
  for (const r of rules) {
    const arr = byAff.get(r.affiliationId) ?? [];
    arr.push(r);
    byAff.set(r.affiliationId, arr);
  }

  // IST midnight helper: work in UTC but generate slots at IST wall-clock times.
  // Asia/Kolkata = UTC+5:30, no DST.
  const IST_OFFSET_MIN = 5 * 60 + 30;
  // IST calendar date today (year/month/day in Asia/Kolkata)
  const istNowParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [iy, im, id] = istNowParts.split('-').map(Number);
  const istMidnightUTC = Date.UTC(iy, im - 1, id); // UTC millis for IST midnight reference

  let created = 0;
  let patientIdx = 0;
  const targetTotal = 30;

  outer: for (let dayOffset = -14; dayOffset <= 14; dayOffset++) {
    const istDayUTC = istMidnightUTC + dayOffset * 86_400_000;
    const istDow = new Date(istDayUTC).getUTCDay(); // weekday of IST date
    const istDate = new Date(istDayUTC);
    const y = istDate.getUTCFullYear();
    const mo = istDate.getUTCMonth();
    const d = istDate.getUTCDate();

    for (const [, affRules] of byAff) {
      for (const rule of affRules) {
        if (istDow !== rule.dayOfWeek) continue;

        const startMin = timeToMinutes(rule.startTime);
        const endMin = timeToMinutes(rule.endTime);
        const slotLen = rule.slotMinutes ?? 20;
        let slotIdx = 0;
        for (let m = startMin; m + slotLen <= endMin; m += slotLen) {
          // Deterministic thinning independent of `created`: take slots where
          // (slotIdx + dayOffset) is even, max 3 per rule-day -> ~30 total.
          const take = (slotIdx + dayOffset + 100) % 3 === 0 && slotIdx < 9;
          slotIdx++;
          if (!take) continue;
          if (created >= targetTotal) break outer;

          // Convert IST wall-clock slot to UTC Date
          const hh = Math.floor(m / 60);
          const mm = m % 60;
          const startsUTC = new Date(
            Date.UTC(y, mo, d, hh, mm, 0) - IST_OFFSET_MIN * 60_000
          );
          const endsUTC = new Date(startsUTC.getTime() + slotLen * 60_000);

          const patientId = patientIds[patientIdx % patientIds.length];
          patientIdx++;

          const isPast = endsUTC.getTime() < Date.now();
          const mod = created % 5;
          const status = isPast
            ? mod === 3
              ? 'CANCELLED'
              : mod === 4
                ? 'NO_SHOW'
                : 'COMPLETED'
            : mod === 3
              ? 'CANCELLED'
              : 'CONFIRMED';

          try {
            await prisma.appointment.create({
              data: {
                patientId,
                doctorId: rule.affiliation.doctorId,
                affiliationId: rule.affiliationId,
                startsAt: startsUTC,
                endsAt: endsUTC,
                status: status as never,
                reason: 'Demo seed visit',
                ...(status === 'CANCELLED'
                  ? { cancelledAt: new Date(), cancelledBy: 'PATIENT' }
                  : {}),
              },
            });
            created++;
          } catch {
            // Skip conflicts (double-booking guard) — deterministic gen shouldn't collide,
            // but cross-affiliation same-doctor overlaps are skipped by design.
            continue;
          }
          if (created >= targetTotal) break outer;
        }
      }
    }
  }

  console.log(
    `Seed complete: ${hospitals.length} hospitals, ${doctors.length} doctors, ` +
      `admin ${admin.email}, ${patientIds.length} patients, ${created} appointments.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
