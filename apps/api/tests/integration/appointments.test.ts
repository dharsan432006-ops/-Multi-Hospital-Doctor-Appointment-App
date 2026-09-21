import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, prisma, registerPatient, loginAs, authHeader } from './helpers.js';

const ADMIN_EMAIL = 'admin@example.test';
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD ?? '';

async function adminToken(): Promise<string> {
  const { accessToken } = await loginAs(ADMIN_EMAIL, ADMIN_PW);
  if (!accessToken) throw new Error('Admin login failed — set SEED_ADMIN_PASSWORD env');
  return accessToken;
}

/** Create isolated hospital + doctor with Mon–Fri 10:00–16:00 IST rules. */
async function makeDoctor(suffix: string) {
  const token = await adminToken();
  const h1 = await request(app)
    .post('/api/hospitals')
    .set(authHeader(token))
    .send({ name: `Test Hospital A ${suffix} ${Date.now()}`, type: 'PRIVATE', hasEmergency: false });
  expect(h1.status).toBe(201);
  const h2 = await request(app)
    .post('/api/hospitals')
    .set(authHeader(token))
    .send({ name: `Test Hospital B ${suffix} ${Date.now()}`, type: 'PRIVATE', hasEmergency: false });
  expect(h2.status).toBe(201);

  const d = await request(app)
    .post('/api/doctors')
    .set(authHeader(token))
    .send({ name: `Test Doctor ${suffix}`, specialty: 'Cardiology', qualifications: 'MBBS', languages: ['English'] });
  expect(d.status).toBe(201);
  const doctorId = d.body.data.id as string;

  for (const h of [h1.body.data, h2.body.data]) {
    await prisma.department.upsert({
      where: { hospitalId_name: { hospitalId: h.id as string, name: 'Cardiology' } },
      update: {},
      create: { hospitalId: h.id as string, name: 'Cardiology' },
    });
  }

  // Affiliation 1 (with rules)
  const a1 = await request(app)
    .post(`/api/doctors/${doctorId}/affiliations`)
    .set(authHeader(token))
    .send({ hospitalId: h1.body.data.id, departmentName: 'Cardiology' });
  expect(a1.status).toBe(201);

  // 5 rules Mon–Fri
  for (let dow = 1; dow <= 5; dow++) {
    await prisma.availabilityRule.create({
      data: { affiliationId: a1.body.data.id as string, dayOfWeek: dow, startTime: '10:00', endTime: '16:00', slotMinutes: 20 },
    });
  }

  // Affiliation 2 (with rules — for cross-hospital test)
  const a2 = await request(app)
    .post(`/api/doctors/${doctorId}/affiliations`)
    .set(authHeader(token))
    .send({ hospitalId: h2.body.data.id, departmentName: 'Cardiology' });
  expect(a2.status).toBe(201);
  for (let dow = 1; dow <= 5; dow++) {
    await prisma.availabilityRule.create({
      data: { affiliationId: a2.body.data.id as string, dayOfWeek: dow, startTime: '10:00', endTime: '16:00', slotMinutes: 20 },
    });
  }

  return { doctorId, h1: h1.body.data, h2: h2.body.data, a1: a1.body.data, a2: a2.body.data };
}

describe('booking guards', () => {
  let ctx: Awaited<ReturnType<typeof makeDoctor>> | null = null;

  beforeAll(async () => {
    ctx = await makeDoctor('guards');
  });

  it('exactly one of two simultaneous bookings for the same slot succeeds', async () => {
    const p1 = await registerPatient();
    const p2 = await registerPatient();
    const t1 = await loginAs(p1.body.email as string, p1.body.password as string);
    const t2 = await loginAs(p2.body.email as string, p2.body.password as string);

    const avail = await request(app).get(`/api/doctors/${ctx!.doctorId}/availability`).query({ hospitalId: ctx!.h1.id });
    expect(avail.status).toBe(200);
    const slot = (avail.body.data as { startsAt: string }[]).find((s) => new Date(s.startsAt).getTime() > Date.now() + 3600_000);
    expect(slot).toBeTruthy();

    const payload = { doctorId: ctx!.doctorId, hospitalId: ctx!.h1.id, startsAt: slot!.startsAt };
    const [r1, r2] = await Promise.all([
      request(app).post('/api/appointments').set(authHeader(t1.accessToken)).send({ ...payload, idempotencyKey: `k1-${Date.now()}` }),
      request(app).post('/api/appointments').set(authHeader(t2.accessToken)).send({ ...payload, idempotencyKey: `k2-${Date.now()}` }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('prevents cross-hospital double booking for the same doctor', async () => {
    const p = await registerPatient();
    const t = await loginAs(p.body.email as string, p.body.password as string);

    const avail = await request(app).get(`/api/doctors/${ctx!.doctorId}/availability`).query({ hospitalId: ctx!.h1.id });
    const slot = (avail.body.data as { startsAt: string }[]).find((s) => new Date(s.startsAt).getTime() > Date.now() + 3600_000);
    expect(slot).toBeTruthy();

    const first = await request(app)
      .post('/api/appointments')
      .set(authHeader(t.accessToken))
      .send({ doctorId: ctx!.doctorId, hospitalId: ctx!.h1.id, startsAt: slot!.startsAt, idempotencyKey: `x1-${Date.now()}` });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/appointments')
      .set(authHeader(t.accessToken))
      .send({ doctorId: ctx!.doctorId, hospitalId: ctx!.h2.id, startsAt: slot!.startsAt, idempotencyKey: `x2-${Date.now()}` });
    expect(second.status).toBe(409);
  });

  it('supports idempotent booking with Idempotency-Key', async () => {
    const p = await registerPatient();
    const t = await loginAs(p.body.email as string, p.body.password as string);
    const avail = await request(app).get(`/api/doctors/${ctx!.doctorId}/availability`).query({ hospitalId: ctx!.h1.id });
    const slot = (avail.body.data as { startsAt: string }[]).find((s) => new Date(s.startsAt).getTime() > Date.now() + 3600_000);
    const key = `idem-${Date.now()}`;
    const r1 = await request(app)
      .post('/api/appointments')
      .set(authHeader(t.accessToken))
      .send({ doctorId: ctx!.doctorId, hospitalId: ctx!.h1.id, startsAt: slot!.startsAt, idempotencyKey: key });
    expect(r1.status).toBe(201);
    // Same key + same patient returns the same booking (no duplicate)
    const avail2 = await request(app).get(`/api/doctors/${ctx!.doctorId}/availability`).query({ hospitalId: ctx!.h1.id });
    const slot2 = (avail2.body.data as { startsAt: string }[]).find((s) => new Date(s.startsAt).getTime() > Date.now() + 3600_000);
    expect(slot2).toBeTruthy();
    void slot2;
    const r2 = await request(app)
      .post('/api/appointments')
      .set(authHeader(t.accessToken))
      .send({ doctorId: ctx!.doctorId, hospitalId: ctx!.h1.id, startsAt: slot!.startsAt, idempotencyKey: key });
    expect(r2.status).toBe(201);
    expect(r2.body.data.id).toBe(r1.body.data.id);
  });
});
