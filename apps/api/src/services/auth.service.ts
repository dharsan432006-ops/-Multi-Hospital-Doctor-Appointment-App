import crypto from 'node:crypto';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/config.js';
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function assertPasswordPolicy(password: string) {
  if (!PASSWORD_RE.test(password)) {
    throw ApiError.badRequest(
      'WEAK_PASSWORD',
      'Password must be 8+ chars with upper, lower, digit and symbol'
    );
  }
}

function signAccess(userId: string): string {
  const cfg = getConfig();
  return jwt.sign({}, cfg.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: cfg.JWT_ACCESS_TTL as never,
  });
}

function newRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function refreshExpiry(): Date {
  const cfg = getConfig();
  return new Date(Date.now() + cfg.JWT_REFRESH_TTL_DAYS * 86_400_000);
}

export const REFRESH_COOKIE = 'refresh_token';

export function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: getConfig().JWT_REFRESH_TTL_DAYS * 86_400_000,
  };
}

export async function registerPatient(input: {
  name: string;
  email: string;
  password: string;
  phone: string;
  consents: string[];
}) {
  assertPasswordPolicy(input.password);
  const email = input.email.toLowerCase().trim();

  if (!input.consents.includes('MEDICAL_CARE')) {
    throw ApiError.badRequest('CONSENT_REQUIRED', 'MEDICAL_CARE consent is required to register');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('EMAIL_TAKEN', 'Email already registered');

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: { email, passwordHash, role: 'PATIENT' },
  });
  const patient = await prisma.patient.create({
    data: { userId: user.id, name: input.name.trim(), phone: input.phone.trim(), email },
  });

  const allowed = ['MEDICAL_CARE', 'APPOINTMENT_COMMUNICATIONS', 'INSURANCE', 'RESEARCH'];
  for (const purpose of input.consents) {
    if (!allowed.includes(purpose)) continue;
    await prisma.consentRecord.upsert({
      where: { userId_purpose_policyVersion: { userId: user.id, purpose: purpose as never, policyVersion: 'v1.0' } },
      update: { withdrawnAt: null },
      create: { userId: user.id, purpose: purpose as never, policyVersion: 'v1.0' },
    });
  }

  return { user, patient };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const ok = await argon2.verify(user.passwordHash, password).catch(() => false);
  if (!ok) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccess(user.id);
  const refresh = newRefreshToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: sha256(refresh), expiresAt: refreshExpiry() },
  });
  return { accessToken, refresh, user };
}

/** Rotating refresh with reuse detection: reuse of a replaced/revoked token revokes the chain. */
export async function refresh(presented: string | undefined) {
  if (!presented) throw ApiError.unauthorized('MISSING_REFRESH', 'Missing refresh token');
  const hash = sha256(presented);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!stored) throw ApiError.unauthorized('INVALID_REFRESH', 'Invalid refresh token');

  if (stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    // Possible reuse: revoke all active tokens for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw ApiError.unauthorized('REFRESH_REUSED', 'Refresh token reused or expired');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) throw ApiError.unauthorized('USER_INACTIVE', 'Account inactive');

  const next = newRefreshToken();
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: 'pending' },
    }),
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: sha256(next), expiresAt: refreshExpiry() },
    }),
  ]);
  // Link replacedBy for audit (best-effort)
  const created = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(next) } });
  if (created) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { replacedById: created.id },
    });
  }

  return { accessToken: signAccess(user.id), refresh: next, user };
}

export async function logout(presented: string | undefined) {
  if (!presented) return;
  const hash = sha256(presented);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
