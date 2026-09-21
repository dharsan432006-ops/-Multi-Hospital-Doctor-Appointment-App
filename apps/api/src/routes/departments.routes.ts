import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

router.get(
  '/',
  validateQuery(z.object({ hospitalId: z.string().optional() })),
  async (req, res, next) => {
    try {
      const { hospitalId } = req.query as { hospitalId?: string };
      const items = await prisma.department.findMany({
        where: hospitalId ? { hospitalId } : {},
        orderBy: { name: 'asc' },
        include: { hospital: { select: { id: true, name: true, slug: true } } },
      });
      res.json({ data: items });
    } catch (e) {
      next(e);
    }
  }
);

const Body = z.object({ hospitalId: z.string().min(1), name: z.string().min(1).max(120) });

router.post('/', authenticate, requireRole('ADMIN'), validateBody(Body), async (req, res, next) => {
  try {
    const created = await prisma.department.create({ data: req.body });
    await writeAudit({ actorUserId: req.user!.id, action: 'DEPT_CREATE', entityType: 'Department', entityId: created.id, req });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateBody(z.object({ name: z.string().min(1).max(120) })),
  async (req, res, next) => {
    try {
      const updated = await prisma.department.update({ where: { id: req.params.id }, data: { name: req.body.name } });
      await writeAudit({ actorUserId: req.user!.id, action: 'DEPT_UPDATE', entityType: 'Department', entityId: updated.id, req });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  }
);

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    await writeAudit({ actorUserId: req.user!.id, action: 'DEPT_DELETE', entityType: 'Department', entityId: req.params.id, req });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
