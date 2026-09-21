import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { parsePagination, pageResponse } from '../lib/pagination.js';
import { maskEmail, maskPhone } from '../lib/crypto.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get(
  '/reports/bookings',
  validateQuery(
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      hospitalId: z.string().optional(),
      specialty: z.string().optional(),
      format: z.enum(['json', 'csv']).default('json'),
    })
  ),
  async (req, res, next) => {
    try {
      const q = req.query as { from?: string; to?: string; hospitalId?: string; specialty?: string; format: 'json' | 'csv' };
      const where: Record<string, unknown> = {};
      if (q.from || q.to) {
        (where as Record<string, unknown>).startsAt = {
          ...(q.from ? { gte: new Date(q.from) } : {}),
          ...(q.to ? { lte: new Date(q.to) } : {}),
        };
      }
      if (q.hospitalId) {
        const affs = await prisma.doctorAffiliation.findMany({ where: { hospitalId: q.hospitalId }, select: { id: true } });
        where.affiliationId = { in: affs.map((a) => a.id) };
      }
      if (q.specialty) {
        const docs = await prisma.doctor.findMany({ where: { specialty: { contains: q.specialty, mode: 'insensitive' } }, select: { id: true } });
        where.doctorId = { in: docs.map((d) => d.id) };
      }

      const appts = await prisma.appointment.findMany({
        where: where as never,
        include: {
          doctor: { select: { specialty: true } },
          affiliation: { include: { hospital: { select: { id: true, name: true } } } },
        },
        orderBy: { startsAt: 'asc' },
      });

      const byDay: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byHospital: Record<string, number> = {};
      const bySpecialty: Record<string, number> = {};
      for (const a of appts) {
        const day = a.startsAt.toISOString().slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
        byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
        const h = a.affiliation.hospital.name;
        byHospital[h] = (byHospital[h] ?? 0) + 1;
        bySpecialty[a.doctor.specialty] = (bySpecialty[a.doctor.specialty] ?? 0) + 1;
      }
      const report = { total: appts.length, byDay, byStatus, byHospital, bySpecialty };

      if (q.format === 'csv') {
        const rows = ['day,bookings', ...Object.entries(byDay).map(([d, c]) => `${d},${c}`)];
        res.header('Content-Type', 'text/csv');
        res.send(rows.join('\n'));
        return;
      }
      res.json({ data: report });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/users',
  validateQuery(z.object({ role: z.string().optional(), q: z.string().optional(), page: z.string().optional(), pageSize: z.string().optional() })),
  async (req, res, next) => {
    try {
      const q = req.query as { role?: string; q?: string; page?: string; pageSize?: string };
      const { page, pageSize, skip, take } = parsePagination(q);
      const where: Record<string, unknown> = {};
      if (q.role) where.role = q.role;
      if (q.q) where.email = { contains: q.q, mode: 'insensitive' };
      const [total, items] = await Promise.all([
        prisma.user.count({ where: where as never }),
        prisma.user.findMany({ where: where as never, orderBy: { createdAt: 'desc' }, skip, take, select: { id: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true } }),
      ]);
      const masked = items.map((u) => ({ ...u, email: maskEmail(u.email) }));
      res.json(pageResponse(masked, total, page, pageSize));
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  '/users/:id/role',
  validateBody(z.object({ role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']) })),
  async (req, res, next) => {
    try {
      const updated = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role as never } });
      await writeAudit({ actorUserId: req.user!.id, action: 'USER_ROLE_CHANGE', entityType: 'User', entityId: updated.id, req, metadata: { role: req.body.role } });
      res.json({ data: { ...updated, passwordHash: undefined } });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/audit-logs',
  validateQuery(z.object({ entityType: z.string().optional(), action: z.string().optional(), page: z.string().optional(), pageSize: z.string().optional() })),
  async (req, res, next) => {
    try {
      const q = req.query as { entityType?: string; action?: string; page?: string; pageSize?: string };
      const { page, pageSize, skip, take } = parsePagination(q);
      const where: Record<string, unknown> = {};
      if (q.entityType) where.entityType = q.entityType;
      if (q.action) where.action = { contains: q.action, mode: 'insensitive' };
      const [total, items] = await Promise.all([
        prisma.auditLog.count({ where: where as never }),
        prisma.auditLog.findMany({ where: where as never, orderBy: { createdAt: 'desc' }, skip, take }),
      ]);
      res.json(pageResponse(items, total, page, pageSize));
    } catch (e) {
      next(e);
    }
  }
);

export { maskPhone };

export default router;
