import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { loginLimiter, refreshLimiter, registerLimiter } from '../middleware/rateLimit.js';
import {
  REFRESH_COOKIE,
  login,
  logout,
  refresh,
  refreshCookieOptions,
  registerPatient,
} from '../services/auth.service.js';
import { writeAudit } from '../lib/audit.js';
import { maskEmail } from '../lib/crypto.js';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
  phone: z.string().min(7).max(20),
  consents: z.array(z.string()).min(1),
});

router.post('/register', registerLimiter, validateBody(RegisterSchema), async (req, res, next) => {
  try {
    const { user, patient } = await registerPatient(req.body);
    await writeAudit({
      actorUserId: user.id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user.id,
      req,
      metadata: { email: maskEmail(user.email), role: user.role },
    });
    res.status(201).json({ data: { id: user.id, email: user.email, patientId: patient.id } });
  } catch (e) {
    next(e);
  }
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', loginLimiter, validateBody(LoginSchema), async (req, res, next) => {
  try {
    const { accessToken, refresh: rt, user } = await login(req.body.email, req.body.password);
    res.cookie(REFRESH_COOKIE, rt, refreshCookieOptions());
    await writeAudit({
      actorUserId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      req,
      metadata: { email: maskEmail(user.email) },
    });
    res.json({ data: { accessToken, user: { id: user.id, email: user.email, role: user.role } } });
  } catch (e) {
    next(e);
  }
});

router.post('/refresh', refreshLimiter, async (req, res, next) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const { accessToken, refresh: rt, user } = await refresh(presented);
    res.cookie(REFRESH_COOKIE, rt, refreshCookieOptions());
    res.json({ data: { accessToken, user: { id: user.id, email: user.email, role: user.role } } });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', refreshLimiter, async (req, res, next) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await logout(presented);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ data: { user: req.user } });
  } catch (e) {
    next(e);
  }
});

export default router;
