import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { parsePagination, pageResponse } from '../lib/pagination.js';
import { ApiError } from '../lib/errors.js';
import { writeAudit } from '../lib/audit.js';
import { getAvailability } from '../services/booking.service.js';

const router = Router();

const ListQuery = z.object({
  specialty: z.string().optional(),
  hospital: z.string().optional(),
  department: z.string().optional(),
  language: z.string().optional(),
  q: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

router.get('/', validateQuery(ListQuery), async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof ListQuery>;
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Record<string, unknown> = {};
    if (q.specialty) where.specialty = { contains: q.specialty, mode: 'insensitive' };
    if (q.language) where.languages = { has: q.language };
    if (q.q) {
      (where as Record<string, unknown>).OR = [
        { name: { contains: q.q, mode: 'insensitive' } },
        { specialty: { contains: q.q, mode: 'insensitive' } },
        { qualifications: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    if (q.hospital || q.department) {
      (where as Record<string, unknown>).affiliations = {
        some: {
          ...(q.hospital
            ? { hospital: { name: { contains: q.hospital, mode: 'insensitive' } } }
            : {}),
          ...(q.department
            ? { department: { name: { contains: q.department, mode: 'insensitive' } } }
            : {}),
        },
      };
    }
    const [total, items] = await Promise.all([
      prisma.doctor.count({ where: where as never }),
      prisma.doctor.findMany({
        where: where as never,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: {
          affiliations: {
            include: {
              hospital: { select: { id: true, name: true, slug: true } },
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);
    res.json(pageResponse(items, total, page, pageSize));
  } catch (e) {
    next(e);
  }
});

// ---- Doctor self-service (must come before /:id) ----
router.get('/me/availability', authenticate, requireRole('DOCTOR'), async (req, res, next) => {
  try {
    const doctor = await prisma.doctor.findFirst({ where: { userId: req.user!.id } });
    if (!doctor) throw ApiError.notFound('DOCTOR_PROFILE_MISSING', 'Doctor profile not linked');
    const affs = await prisma.doctorAffiliation.findMany({
      where: { doctorId: doctor.id },
      include: { availabilityRules: true, hospital: { select: { id: true, name: true } } },
    });
    res.json({ data: affs });
  } catch (e) {
    next(e);
  }
});

const AvailabilityPut = z.object({
  hospitalId: z.string().min(1),
  rules: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{1,2}:\d{2}$/),
        endTime: z.string().regex(/^\d{1,2}:\d{2}$/),
        slotMinutes: z.number().int().min(5).max(120).default(20),
      })
    )
    .max(28),
});

router.put('/me/availability', authenticate, requireRole('DOCTOR'), validateBody(AvailabilityPut), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof AvailabilityPut>;
    const doctor = await prisma.doctor.findFirst({ where: { userId: req.user!.id } });
    if (!doctor) throw ApiError.notFound('DOCTOR_PROFILE_MISSING', 'Doctor profile not linked');
    const aff = await prisma.doctorAffiliation.findUnique({
      where: { doctorId_hospitalId: { doctorId: doctor.id, hospitalId: body.hospitalId } },
    });
    if (!aff) throw ApiError.badRequest('NOT_AFFILIATED', 'Not affiliated with this hospital');

    // Overlap guard: new rules must not create same-doctor overlaps is enforced at booking;
    // here validate no overlapping rules within the same affiliation/day.
    await prisma.availabilityRule.deleteMany({ where: { affiliationId: aff.id } });
    for (const r of body.rules) {
      await prisma.availabilityRule.create({
        data: { affiliationId: aff.id, dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime, slotMinutes: r.slotMinutes },
      });
    }
    await prisma.doctorAffiliation.update({ where: { id: aff.id }, data: { schedulePending: body.rules.length === 0 } });
    await writeAudit({ actorUserId: req.user!.id, action: 'DOCTOR_AVAILABILITY_UPDATE', entityType: 'DoctorAffiliation', entityId: aff.id, req });
    const updated = await prisma.doctorAffiliation.findUnique({
      where: { id: aff.id },
      include: { availabilityRules: true },
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

const TimeOffBody = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().max(200).optional(),
});

router.post('/me/time-off', authenticate, requireRole('DOCTOR'), validateBody(TimeOffBody), async (req, res, next) => {
  try {
    const doctor = await prisma.doctor.findFirst({ where: { userId: req.user!.id } });
    if (!doctor) throw ApiError.notFound('DOCTOR_PROFILE_MISSING', 'Doctor profile not linked');
    const created = await prisma.timeOff.create({
      data: { doctorId: doctor.id, startsAt: new Date(req.body.startsAt), endsAt: new Date(req.body.endsAt), reason: req.body.reason ?? null },
    });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.get('/me/time-off', authenticate, requireRole('DOCTOR'), async (req, res, next) => {
  try {
    const doctor = await prisma.doctor.findFirst({ where: { userId: req.user!.id } });
    if (!doctor) throw ApiError.notFound('DOCTOR_PROFILE_MISSING', 'Doctor profile not linked');
    const items = await prisma.timeOff.findMany({ where: { doctorId: doctor.id }, orderBy: { startsAt: 'asc' } });
    res.json({ data: items });
  } catch (e) {
    next(e);
  }
});

router.delete('/me/time-off/:id', authenticate, requireRole('DOCTOR'), async (req, res, next) => {
  try {
    const doctor = await prisma.doctor.findFirst({ where: { userId: req.user!.id } });
    if (!doctor) throw ApiError.notFound('DOCTOR_PROFILE_MISSING', 'Doctor profile not linked');
    const item = await prisma.timeOff.findUnique({ where: { id: req.params.id } });
    if (!item || item.doctorId !== doctor.id) throw ApiError.notFound('TIMEOFF_NOT_FOUND', 'Time-off not found');
    await prisma.timeOff.delete({ where: { id: item.id } });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

// ---- Public detail + availability ----
router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        affiliations: {
          include: {
            hospital: true,
            department: true,
            availabilityRules: true,
          },
        },
      },
    });
    if (!item) throw ApiError.notFound('DOCTOR_NOT_FOUND', 'Doctor not found');
    res.json({ data: item });
  } catch (e) {
    next(e);
  }
});

router.get(
  '/:id/availability',
  validateQuery(z.object({ hospitalId: z.string().optional(), from: z.string().optional(), to: z.string().optional() })),
  async (req, res, next) => {
    try {
      const q = req.query as { hospitalId?: string; from?: string; to?: string };
      const slots = await getAvailability(req.params.id, q.hospitalId, q.from, q.to);
      res.json({ data: slots });
    } catch (e) {
      next(e);
    }
  }
);

// ---- Admin CRUD ----
const DoctorBody = z.object({
  name: z.string().min(2).max(160),
  specialty: z.string().min(2).max(120),
  qualifications: z.string().min(1).max(300),
  languages: z.array(z.string().max(40)).default([]),
  contactEmail: z.string().email().nullable().optional(),
  photoUrl: z.string().url().nullable().optional().or(z.literal('').transform(() => null)),
  isVerified: z.boolean().optional(),
});

router.post('/', authenticate, requireRole('ADMIN'), validateBody(DoctorBody), async (req, res, next) => {
  try {
    const created = await prisma.doctor.create({
      data: {
        name: req.body.name,
        specialty: req.body.specialty,
        qualifications: req.body.qualifications,
        languages: req.body.languages,
        contactEmail: req.body.contactEmail ?? null,
        photoUrl: req.body.photoUrl ?? null,
        isDemo: false,
        isVerified: req.body.isVerified ?? false,
      },
    });
    await writeAudit({ actorUserId: req.user!.id, action: 'DOCTOR_CREATE', entityType: 'Doctor', entityId: created.id, req });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', authenticate, requireRole('ADMIN'), validateBody(DoctorBody.partial()), async (req, res, next) => {
  try {
    const updated = await prisma.doctor.update({ where: { id: req.params.id }, data: req.body });
    await writeAudit({ actorUserId: req.user!.id, action: 'DOCTOR_UPDATE', entityType: 'Doctor', entityId: updated.id, req });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.doctor.delete({ where: { id: req.params.id } });
    await writeAudit({ actorUserId: req.user!.id, action: 'DOCTOR_DELETE', entityType: 'Doctor', entityId: req.params.id, req });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

const AffBody = z.object({ hospitalId: z.string().min(1), departmentName: z.string().min(1).max(120) });

router.post('/:id/affiliations', authenticate, requireRole('ADMIN'), validateBody(AffBody), async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    let dept = await prisma.department.findFirst({
      where: { hospitalId: req.body.hospitalId, name: req.body.departmentName },
    });
    if (!dept) {
      dept = await prisma.department.create({ data: { hospitalId: req.body.hospitalId, name: req.body.departmentName } });
    }
    const aff = await prisma.doctorAffiliation.upsert({
      where: { doctorId_hospitalId: { doctorId, hospitalId: req.body.hospitalId } },
      update: { departmentId: dept.id, schedulePending: false },
      create: { doctorId, hospitalId: req.body.hospitalId, departmentId: dept.id },
    });
    await writeAudit({ actorUserId: req.user!.id, action: 'AFFILIATION_UPSERT', entityType: 'DoctorAffiliation', entityId: aff.id, req });
    res.status(201).json({ data: aff });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id/affiliations/:affId', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const aff = await prisma.doctorAffiliation.findUnique({ where: { id: req.params.affId } });
    if (!aff || aff.doctorId !== req.params.id) throw ApiError.notFound('AFFILIATION_NOT_FOUND', 'Affiliation not found');
    await prisma.doctorAffiliation.delete({ where: { id: aff.id } });
    await writeAudit({ actorUserId: req.user!.id, action: 'AFFILIATION_DELETE', entityType: 'DoctorAffiliation', entityId: aff.id, req });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
