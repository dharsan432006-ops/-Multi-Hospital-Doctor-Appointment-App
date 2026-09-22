import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();
const PURPOSES = ['MEDICAL_CARE', 'APPOINTMENT_COMMUNICATIONS', 'INSURANCE', 'RESEARCH'];

router.get('/', authenticate, async (req, res, next) => {
  try {
    const items = await prisma.consentRecord.findMany({ where: { userId: req.user!.id }, orderBy: { purpose: 'asc' } });
    res.json({ data: items });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, validateBody(z.object({ purpose: z.enum(PURPOSES as never), policyVersion: z.string().default('v1.0') })), async (req, res, next) => {
  try {
    const rec = await prisma.consentRecord.upsert({
      where: { userId_purpose_policyVersion: { userId: req.user!.id, purpose: req.body.purpose, policyVersion: req.body.policyVersion } },
      update: { withdrawnAt: null, grantedAt: new Date() },
      create: { userId: req.user!.id, purpose: req.body.purpose, policyVersion: req.body.policyVersion },
    });
    await writeAudit({ actorUserId: req.user!.id, action: 'CONSENT_GRANT', entityType: 'ConsentRecord', entityId: rec.id, req, metadata: { purpose: req.body.purpose } });
    res.status(201).json({ data: rec });
  } catch (e) {
    next(e);
  }
});

router.delete('/:purpose', authenticate, async (req, res, next) => {
  try {
    if (!PURPOSES.includes(req.params.purpose)) {
      res.status(404).json({ error: { code: 'UNKNOWN_PURPOSE', message: 'Unknown consent purpose' } });
      return;
    }
    // Withdraw ALL policy versions for this purpose (not just v1.0).
    const recs = await prisma.consentRecord.findMany({
      where: { userId: req.user!.id, purpose: req.params.purpose as never, withdrawnAt: null },
    });
    if (recs.length === 0) {
      res.json({ data: { ok: true, withdrawn: 0 } });
      return;
    }
    await prisma.consentRecord.updateMany({
      where: { userId: req.user!.id, purpose: req.params.purpose as never, withdrawnAt: null },
      data: { withdrawnAt: new Date() },
    });
    const first = recs[0];
    await writeAudit({ actorUserId: req.user!.id, action: 'CONSENT_WITHDRAW', entityType: 'ConsentRecord', entityId: first.id, req, metadata: { purpose: req.params.purpose, withdrawn: recs.length } });
    const updated = await prisma.consentRecord.findUnique({ where: { id: first.id } });
    res.json({ data: { ...updated, withdrawn: recs.length } });
  } catch (e) {
    next(e);
  }
});

export default router;
