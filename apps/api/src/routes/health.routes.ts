import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { isRedisReady } from '../lib/redis.js';

const router = Router();

router.get('/', async (_req, res) => {
  const checks: Record<string, string> = { api: 'ok' };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = 'ok';
  } catch {
    checks.db = 'down';
  }
  try {
    checks.redis = (await isRedisReady()) ? 'ok' : 'down';
  } catch {
    checks.redis = 'down';
  }
  const ok = checks.db === 'ok';
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', time: new Date().toISOString(), checks });
});

export default router;
