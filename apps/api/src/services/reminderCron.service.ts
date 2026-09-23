import { prisma } from '../lib/prisma.js';
import { getConfig } from '../config/config.js';
import { notifyAppointment } from './notification.service.js';

export interface ReminderJobResult {
  timestamp: string;
  windowStart: string;
  windowEnd: string;
  found: number;
  sent: number;
  skipped: number;
  failed: number;
  details: {
    appointmentId: string;
    patientEmail?: string;
    patientPhone?: string;
    startsAt: string;
    status: string;
  }[];
}

/**
 * Scans for appointments scheduled in the 24-hour reminder window
 * (typically 23 to 25 hours from now) that haven't received a REMINDER_24H notification.
 * Dispatches email/SMS reminders using the configured notification provider settings.
 */
export async function process24HourAppointmentReminders(): Promise<ReminderJobResult> {
  const now = new Date();
  // Target window: appointments starting between 23 hours and 25 hours from now
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const result: ReminderJobResult = {
    timestamp: now.toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    found: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  try {
    const candidates = await prisma.appointment.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PENDING'] },
        startsAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        notifications: {
          none: {
            type: 'REMINDER_24H',
            status: { in: ['SENT', 'SIMULATED'] },
          },
        },
      },
      include: {
        patient: true,
        doctor: true,
        affiliation: {
          include: {
            hospital: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    result.found = candidates.length;

    for (const appt of candidates) {
      try {
        await notifyAppointment(appt.id, 'REMINDER_24H', {
          toEmail: appt.patient.email,
          toPhone: appt.patient.phone,
          whenIst: appt.startsAt.toISOString(),
          doctorName: appt.doctor.name,
        });

        result.sent += 1;
        result.details.push({
          appointmentId: appt.id,
          patientEmail: appt.patient.email,
          patientPhone: appt.patient.phone,
          startsAt: appt.startsAt.toISOString(),
          status: 'REMINDER_DISPATCHED',
        });
      } catch (err) {
        result.failed += 1;
        result.details.push({
          appointmentId: appt.id,
          patientEmail: appt.patient.email,
          patientPhone: appt.patient.phone,
          startsAt: appt.startsAt.toISOString(),
          status: `FAILED: ${(err as Error)?.message ?? String(err)}`,
        });
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ReminderCron] Failed during candidate query:', err);
  }

  return result;
}

let cronTimer: NodeJS.Timeout | null = null;

/**
 * Starts the automated cron job to check and send 24-hour reminders periodically.
 * Default interval is 15 minutes.
 */
export function startReminderCron(intervalMs: number = 15 * 60 * 1000): () => void {
  if (cronTimer) {
    clearInterval(cronTimer);
  }

  const cfg = getConfig();
  // eslint-disable-next-line no-console
  console.log(`[ReminderCron] Initializing 24h reminder cron service (provider: ${cfg.NOTIFICATION_PROVIDER}, interval: ${Math.round(intervalMs / 60000)}m)`);

  // Run initial check shortly after startup
  setTimeout(() => {
    process24HourAppointmentReminders().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ReminderCron] Initial run error:', err);
    });
  }, 5000).unref();

  cronTimer = setInterval(() => {
    process24HourAppointmentReminders().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ReminderCron] Periodic run error:', err);
    });
  }, intervalMs);

  cronTimer.unref();

  return () => {
    if (cronTimer) {
      clearInterval(cronTimer);
      cronTimer = null;
    }
  };
}

export function stopReminderCron() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}
