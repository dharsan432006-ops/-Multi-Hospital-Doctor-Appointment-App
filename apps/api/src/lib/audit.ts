import type { Request } from 'express';
import { prisma } from './prisma.js';

export async function writeAudit(opts: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  req?: Request;
  /** Must already be PHI-masked. Never pass raw phone/email/notes. */
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: opts.actorUserId ?? null,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        ip: opts.req?.ip ?? null,
        userAgent: (opts.req?.headers['user-agent'] as string | undefined) ?? null,
        metadata: (opts.metadata ?? {}) as never,
      },
    });
  } catch {
    // Audit must never break the request path.
  }
}
