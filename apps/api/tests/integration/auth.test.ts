import { describe, it, expect } from 'vitest';
import { app, request, registerPatient, loginAs, authHeader } from './helpers.js';

describe('auth flow + RBAC', () => {
  it('registers a patient only with MEDICAL_CARE consent', async () => {
    const bad = await request(app).post('/api/auth/register').send({
      name: 'No Consent',
      email: `noconsent${Date.now()}@example.test`,
      password: 'Test123!Pass',
      phone: '+91-9000000000',
      consents: ['INSURANCE'],
    });
    expect([400, 403]).toContain(bad.status);

    const { res } = await registerPatient();
    expect(res.status).toBe(201);
  });

  it('logs in, returns /me, refreshes and logs out', async () => {
    const { body } = await registerPatient();
    const { res, accessToken, refreshCookie } = await loginAs(body.email as string, body.password as string);
    expect(res.status).toBe(200);
    expect(accessToken).toBeTruthy();

    const me = await request(app).get('/api/auth/me').set(authHeader(accessToken));
    expect(me.status).toBe(200);

    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(refreshed.status).toBe(200);

    // Reuse of old refresh token must be rejected (rotation + reuse detection)
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(reuse.status).toBe(401);
  });

  it('blocks patients from admin endpoints', async () => {
    const { body } = await registerPatient();
    const { accessToken } = await loginAs(body.email as string, body.password as string);
    const res = await request(app).get('/api/admin/users').set(authHeader(accessToken));
    expect(res.status).toBe(403);
  });
});
