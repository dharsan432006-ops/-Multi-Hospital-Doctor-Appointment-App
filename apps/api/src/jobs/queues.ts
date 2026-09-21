import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { getConfig } from '../config/config.js';
import { notifyAppointment, type NotifyType } from '../services/notification.service.js';

/** Short timeout race so a dead Redis can never hang a booking request. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer!)) as Promise<T>;
}

let notifyQueue: Queue | null = null;
let reminderQueue: Queue | null = null;
let redisOk: boolean | null = null;
let lastCheck = 0;

async function redisAvailable(): Promise<boolean> {
  const now = Date.now();
  if (redisOk !== null && now - lastCheck < 10_000) return redisOk;
  try {
    const cfg = getConfig();
    const probe = new IORedis(cfg.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: false,
      connectTimeout: 1500,
    });
    const pong = await withTimeout(probe.ping(), 2000, 'redis ping');
    await probe.quit().catch(() => undefined);
    redisOk = pong === 'PONG';
  } catch {
    redisOk = false;
  }
  lastCheck = now;
  return redisOk;
}

async function queues(): Promise<{ notify: Queue; reminders: Queue } | null> {
  try {
    if (!(await redisAvailable())) return null;
    const cfg = getConfig();
    const mkConn = () =>
      new IORedis(cfg.REDIS_URL, { maxRetriesPerRequest: 3, enableReadyCheck: false });
    if (!notifyQueue) notifyQueue = new Queue('notifications', { connection: mkConn() });
    if (!reminderQueue) reminderQueue = new Queue('reminders', { connection: mkConn() });
    return { notify: notifyQueue, reminders: reminderQueue };
  } catch {
    return null;
  }
}

async function inline(type: NotifyType, appointmentId: string) {
  await notifyAppointment(appointmentId, type).catch(() => undefined);
}

export async function enqueueAppointmentEvent(appointmentId: string, type: NotifyType) {
  try {
    const q = await withTimeout(queues(), 3000, 'queue init');
    if (!q) {
      await inline(type, appointmentId);
      return;
    }
    await withTimeout(
      q.notify.add(
        type,
        { appointmentId, type },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      ),
      4000,
      'queue add'
    ).catch(() => inline(type, appointmentId));
  } catch {
    await inline(type, appointmentId);
  }
}

export async function scheduleReminders(appointmentId: string, startsAt: Date) {
  try {
    const q = await withTimeout(queues(), 3000, 'queue init');
    if (!q) return; // inline reminders are covered by inline confirmation; cron handles the rest
    const now = Date.now();
    for (const [type, beforeMs] of [['REMINDER_24H', 24 * 3600_000], ['REMINDER_2H', 2 * 3600_000]] as [NotifyType, number][]) {
      const delay = startsAt.getTime() - beforeMs - now;
      if (delay <= 0) continue;
      await withTimeout(
        q.reminders.add(
          type,
          { appointmentId, type },
          { delay, attempts: 3, jobId: `${appointmentId}:${type}` }
        ),
        4000,
        'reminder add'
      ).catch(() => undefined);
    }
  } catch {
    // never break booking on queue failures
  }
}

export function startWorkers() {
  try {
    if (process.env.NODE_ENV === 'test') return;
    if (process.env.WORKERS_ENABLED === 'false') return;
    const cfg = getConfig();
    if (!cfg.REDIS_URL) return;
    const mkConn = () => new IORedis(cfg.REDIS_URL, { maxRetriesPerRequest: 3 });
    const w1 = new Worker(
      'notifications',
      async (job) => {
        const { appointmentId, type } = job.data as { appointmentId: string; type: NotifyType };
        await notifyAppointment(appointmentId, type);
      },
      { connection: mkConn() }
    );
    const w2 = new Worker(
      'reminders',
      async (job) => {
        const { appointmentId, type } = job.data as { appointmentId: string; type: NotifyType };
        await notifyAppointment(appointmentId, type);
      },
      { connection: mkConn() }
    );
    // Never let worker errors crash the API process.
    w1.on('error', (e) => console.warn('notifications worker error:', (e as Error)?.message ?? e));
    w2.on('error', (e) => console.warn('reminders worker error:', (e as Error)?.message ?? e));
  } catch (e) {
    console.warn('workers not started:', (e as Error)?.message ?? e);
  }
}
