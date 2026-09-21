import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

export const app = createApp();
export { request, prisma };

let n = 0;
export function uniqueEmail(prefix = 'test'): string {
  n += 1;
  return `${prefix}+${Date.now()}_${n}@example.test`;
}

export async function registerPatient(overrides?: Partial<Record<string, unknown>>) {
  const body = {
    name: 'Test Patient',
    email: uniqueEmail('patient'),
    password: 'Test123!Pass',
    phone: '+91-9000000099',
    consents: ['MEDICAL_CARE', 'APPOINTMENT_COMMUNICATIONS'],
    ...(overrides ?? {}),
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { body, res };
}

export async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  const cookies: string[] = res.headers['set-cookie'] ?? [];
  const refresh = cookies.find((c) => c.startsWith('refresh_token='))?.split(';')[0] ?? '';
  return { res, accessToken: (res.body?.data?.accessToken as string) ?? '', refreshCookie: refresh };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
