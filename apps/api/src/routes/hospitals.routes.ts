import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { parsePagination, pageResponse } from '../lib/pagination.js';
import { ApiError } from '../lib/errors.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

const ListQuery = z.object({
  q: z.string().optional(),
  accreditation: z.string().optional(),
  emergency: z.enum(['true', 'false']).optional(),
  type: z.enum(['PRIVATE', 'GOVERNMENT']).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

router.get('/', validateQuery(ListQuery), async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof ListQuery>;
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Record<string, unknown> = {};
    if (q.q) where.name = { contains: q.q, mode: 'insensitive' };
    if (q.accreditation) where.accreditation = { has: q.accreditation };
    if (q.emergency) where.hasEmergency = q.emergency === 'true';
    if (q.type) where.type = q.type;

    const [total, items] = await Promise.all([
      prisma.hospital.count({ where: where as never }),
      prisma.hospital.findMany({
        where: where as never,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: { departments: { select: { id: true, name: true } } },
      }),
    ]);
    res.json(pageResponse(items, total, page, pageSize));
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.hospital.findUnique({
      where: { id: req.params.id },
      include: { departments: true },
    });
    if (!item) throw ApiError.notFound('HOSPITAL_NOT_FOUND', 'Hospital not found');
    res.json({ data: item });
  } catch (e) {
    next(e);
  }
});

const HospitalBody = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(['PRIVATE', 'GOVERNMENT']),
  address: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  contact: z.string().max(40).nullable().optional(),
  website: z.string().url().max(300).nullable().optional().or(z.literal('').transform(() => null)),
  accreditation: z.array(z.string().max(40)).default([]),
  hasEmergency: z.boolean().default(false),
  beds: z.number().int().positive().nullable().optional(),
  bedsNote: z.string().max(500).nullable().optional(),
  keySpecialties: z.array(z.string().max(80)).default([]),
  dataVerified: z.boolean().default(false),
  departments: z.array(z.string().min(1).max(120)).optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

router.post('/', authenticate, requireRole('ADMIN'), validateBody(HospitalBody), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof HospitalBody>;
    const base = slugify(body.name);
    let slug = base;
    for (let i = 2; await prisma.hospital.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    const created = await prisma.hospital.create({
      data: {
        slug,
        name: body.name,
        type: body.type as never,
        address: body.address ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        contact: body.contact ?? null,
        website: body.website ?? null,
        accreditation: body.accreditation,
        hasEmergency: body.hasEmergency,
        beds: body.beds ?? null,
        bedsNote: body.bedsNote ?? null,
        keySpecialties: body.keySpecialties,
        dataVerified: body.dataVerified,
        departments: body.departments
          ? { create: [...new Set(body.departments)].map((name) => ({ name })) }
          : undefined,
      },
      include: { departments: true },
    });
    await writeAudit({ actorUserId: req.user!.id, action: 'HOSPITAL_CREATE', entityType: 'Hospital', entityId: created.id, req });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', authenticate, requireRole('ADMIN'), validateBody(HospitalBody.partial()), async (req, res, next) => {
  try {
    const body = req.body as Partial<z.infer<typeof HospitalBody>>;
    const existing = await prisma.hospital.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('HOSPITAL_NOT_FOUND', 'Hospital not found');
    const updated = await prisma.hospital.update({
      where: { id: req.params.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.type ? { type: body.type as never } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
        ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
        ...(body.contact !== undefined ? { contact: body.contact } : {}),
        ...(body.website !== undefined ? { website: body.website } : {}),
        ...(body.accreditation ? { accreditation: body.accreditation } : {}),
        ...(body.hasEmergency !== undefined ? { hasEmergency: body.hasEmergency } : {}),
        ...(body.beds !== undefined ? { beds: body.beds } : {}),
        ...(body.bedsNote !== undefined ? { bedsNote: body.bedsNote } : {}),
        ...(body.keySpecialties ? { keySpecialties: body.keySpecialties } : {}),
        ...(body.dataVerified !== undefined ? { dataVerified: body.dataVerified } : {}),
      },
      include: { departments: true },
    });
    if (body.departments) {
      for (const name of new Set(body.departments)) {
        await prisma.department.upsert({
          where: { hospitalId_name: { hospitalId: updated.id, name } },
          update: {},
          create: { hospitalId: updated.id, name },
        });
      }
    }
    await writeAudit({ actorUserId: req.user!.id, action: 'HOSPITAL_UPDATE', entityType: 'Hospital', entityId: updated.id, req });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const affs = await prisma.doctorAffiliation.count({ where: { hospitalId: req.params.id } });
    if (affs > 0) throw ApiError.badRequest('HOSPITAL_IN_USE', 'Hospital has doctor affiliations');
    await prisma.hospital.delete({ where: { id: req.params.id } });
    await writeAudit({ actorUserId: req.user!.id, action: 'HOSPITAL_DELETE', entityType: 'Hospital', entityId: req.params.id, req });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
