import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { parsePagination, pageResponse } from '../lib/pagination.js';
import { ApiError } from '../lib/errors.js';
import { writeAudit } from '../lib/audit.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  setAppointmentStatus,
} from '../services/booking.service.js';

const router = Router();

const BookBody = z.object({
  doctorId: z.string().min(1),
  hospitalId: z.string().min(1).optional(),
  affiliationId: z.string().min(1).optional(),
  startsAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
  idempotencyKey: z.string().max(100).optional(),
});

router.post('/', authenticate, requireRole('PATIENT'), bookingLimiter, validateBody(BookBody), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
    if (!patient) throw ApiError.notFound('PATIENT_PROFILE_MISSING', 'Patient profile not found');
    const headerKey = req.headers['idempotency-key'] as string | undefined;
    const created = await bookAppointment({
      patientId: patient.id,
      patientUserId: req.user!.id,
      doctorId: req.body.doctorId,
      hospitalId: req.body.hospitalId,
      affiliationId: req.body.affiliationId,
      startsAt: req.body.startsAt,
      reason: req.body.reason,
      idempotencyKey: req.body.idempotencyKey ?? headerKey,
    });
    await writeAudit({ actorUserId: req.user!.id, action: 'APPOINTMENT_CREATE', entityType: 'Appointment', entityId: created.id, req });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

const ListQuery = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']).optional(),
  hospitalId: z.string().min(1).optional(),
  doctorId: z.string().min(1).optional(),
  patientId: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

router.get('/', authenticate, validateQuery(ListQuery), async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof ListQuery>;
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.from || q.to) {
      (where as Record<string, unknown>).startsAt = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    if (req.user!.role === 'PATIENT') {
      const me = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
      where.patientId = me?.id ?? 'none';
    } else if (req.user!.role === 'DOCTOR') {
      const doc = await prisma.doctor.findFirst({ where: { userId: req.user!.id } });
      where.doctorId = doc?.id ?? 'none';
      if (q.patientId) where.patientId = q.patientId;
    } else {
      if (q.patientId) where.patientId = q.patientId;
      if (q.doctorId) where.doctorId = q.doctorId;
    }
    if (q.hospitalId) {
      const affs = await prisma.doctorAffiliation.findMany({ where: { hospitalId: q.hospitalId }, select: { id: true } });
      where.affiliationId = { in: affs.map((a) => a.id) };
    }

    const [total, items] = await Promise.all([
      prisma.appointment.count({ where: where as never }),
      prisma.appointment.findMany({
        where: where as never,
        orderBy: { startsAt: 'asc' },
        skip,
        take,
        include: {
          doctor: { select: { id: true, name: true, specialty: true } },
          affiliation: { include: { hospital: { select: { id: true, name: true } } } },
        },
      }),
    ]);
    res.json(pageResponse(items, total, page, pageSize));
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { doctor: true, affiliation: { include: { hospital: true } } },
    });
    if (!appt) throw ApiError.notFound('APPOINTMENT_NOT_FOUND', 'Appointment not found');
    if (req.user!.role === 'PATIENT') {
      const me = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
      if (!me || appt.patientId !== me.id) throw ApiError.forbidden('NOT_YOUR_BOOKING', 'Not your booking');
    }
    if (req.user!.role === 'DOCTOR') {
      const doc = await prisma.doctor.findFirst({ where: { userId: req.user!.id } });
      if (!doc || appt.doctorId !== doc.id) throw ApiError.forbidden('NOT_YOUR_APPOINTMENT', 'Not your appointment');
    }
    res.json({ data: appt });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/cancel', authenticate, bookingLimiter, validateBody(z.object({}).passthrough()), async (req, res, next) => {
  try {
    const updated = await cancelAppointment({ appointmentId: req.params.id, actor: { id: req.user!.id, role: req.user!.role } });
    await writeAudit({ actorUserId: req.user!.id, action: 'APPOINTMENT_CANCEL', entityType: 'Appointment', entityId: updated.id, req });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/:id/reschedule',
  authenticate,
  bookingLimiter,
  validateBody(z.object({ startsAt: z.string().datetime() })),
  async (req, res, next) => {
    try {
      const updated = await rescheduleAppointment({
        appointmentId: req.params.id,
        newStartsAt: req.body.startsAt,
        actor: { id: req.user!.id, role: req.user!.role },
      });
      await writeAudit({ actorUserId: req.user!.id, action: 'APPOINTMENT_RESCHEDULE', entityType: 'Appointment', entityId: updated.id, req });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('DOCTOR', 'ADMIN'),
  validateBody(z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']) })),
  async (req, res, next) => {
    try {
      if (req.user!.role === 'DOCTOR') {
        const appt = await prisma.appointment.findUnique({ where: { id: req.params.id } });
        if (!appt) throw ApiError.notFound('APPOINTMENT_NOT_FOUND', 'Appointment not found');
        const doc = await prisma.doctor.findFirst({ where: { userId: req.user!.id } });
        if (!doc || appt.doctorId !== doc.id) throw ApiError.forbidden('NOT_YOUR_APPOINTMENT', 'Not your appointment');
      }
      const updated = await setAppointmentStatus({
        appointmentId: req.params.id,
        status: req.body.status,
        actor: { id: req.user!.id, role: req.user!.role },
      });
      await writeAudit({ actorUserId: req.user!.id, action: `APPOINTMENT_${req.body.status}`, entityType: 'Appointment', entityId: updated.id, req });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
