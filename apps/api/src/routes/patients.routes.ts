import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { decryptText, encryptText, maskEmail, maskPhone } from '../lib/crypto.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

async function myPatient(userId: string) {
  const p = await prisma.patient.findUnique({ where: { userId } });
  if (!p) throw ApiError.notFound('PATIENT_PROFILE_MISSING', 'Patient profile not found');
  return p;
}

router.get('/me', authenticate, requireRole('PATIENT', 'ADMIN'), async (req, res, next) => {
  try {
    if (req.user!.role === 'ADMIN') {
      res.status(403).json({ error: { code: 'USE_ADMIN_ENDPOINT', message: 'Admins use GET /patients/:id' } });
      return;
    }
    const p = await myPatient(req.user!.id);
    const { medicalNotesEnc: _enc, ...rest } = p;
    const out = { ...rest, medicalNotes: p.medicalNotesEnc ? decryptText(p.medicalNotesEnc) : null };
    res.json({ data: out });
  } catch (e) {
    next(e);
  }
});

const UpdateMe = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  medicalNotes: z.string().max(5000).nullable().optional(),
});

router.put('/me', authenticate, requireRole('PATIENT'), validateBody(UpdateMe), async (req, res, next) => {
  try {
    const p = await myPatient(req.user!.id);
    const body = req.body as z.infer<typeof UpdateMe>;
    const updated = await prisma.patient.update({
      where: { id: p.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null } : {}),
        ...(body.gender !== undefined ? { gender: body.gender } : {}),
        ...(body.medicalNotes !== undefined
          ? { medicalNotesEnc: body.medicalNotes ? encryptText(body.medicalNotes) : null }
          : {}),
      },
    });
    res.json({ data: { ...updated, medicalNotesEnc: undefined, medicalNotes: body.medicalNotes !== undefined ? body.medicalNotes : undefined } });
  } catch (e) {
    next(e);
  }
});

// Admin read (audited, masked by default via query param).
// medicalNotesEnc is NEVER returned; decrypted notes only on explicit masked=false.
router.get('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const p = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!p) throw ApiError.notFound('PATIENT_NOT_FOUND', 'Patient not found');
    const masked = req.query.masked !== 'false';
    await writeAudit({
      actorUserId: req.user!.id,
      action: 'PATIENT_READ',
      entityType: 'Patient',
      entityId: p.id,
      req,
      metadata: { email: maskEmail(p.email), phone: maskPhone(p.phone), masked },
    });
    if (masked) {
      const { medicalNotesEnc: _enc, ...rest } = p;
      res.json({
        data: { ...rest, email: maskEmail(p.email), phone: maskPhone(p.phone), medicalNotes: undefined },
      });
      return;
    }
    let medicalNotes: string | null = null;
    try {
      medicalNotes = p.medicalNotesEnc ? decryptText(p.medicalNotesEnc) : null;
    } catch {
      medicalNotes = null;
    }
    const { medicalNotesEnc: _enc, ...rest } = p;
    res.json({ data: { ...rest, medicalNotes } });
  } catch (e) {
    next(e);
  }
});

export default router;
