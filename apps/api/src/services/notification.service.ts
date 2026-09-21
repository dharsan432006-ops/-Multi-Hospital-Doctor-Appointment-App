import { prisma } from '../lib/prisma.js';
import { maskEmail, maskPhone } from '../lib/crypto.js';
import { getConfig } from '../config/config.js';

export type NotifyChannel = 'EMAIL' | 'SMS' | 'CONSOLE';
export type NotifyType =
  | 'BOOKING_CONFIRMED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'REMINDER_24H'
  | 'REMINDER_2H'
  | 'DOCTOR_NEW_BOOKING';

async function commsOptedIn(patientId: string): Promise<boolean> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  });
  if (!patient) return true;
  const rec = await prisma.consentRecord.findUnique({
    where: {
      userId_purpose_policyVersion: {
        userId: patient.userId,
        purpose: 'APPOINTMENT_COMMUNICATIONS' as never,
        policyVersion: 'v1.0',
      },
    },
  });
  if (!rec) return true;
  return !rec.withdrawnAt;
}

async function log(
  appointmentId: string | null,
  channel: NotifyChannel,
  type: NotifyType,
  status: 'QUEUED' | 'SENT' | 'FAILED',
  providerMessageId?: string
) {
  try {
    await prisma.notificationLog.create({
      data: { appointmentId, channel, type, status, providerMessageId },
    });
  } catch {
    // logging must not break booking
  }
}

async function sendEmail(to: string, subject: string, text: string) {
  const cfg = getConfig();
  const provider = cfg.NOTIFICATION_PROVIDER;
  if (provider === 'console' || provider === 'twilio' || !cfg.SENDGRID_API_KEY) {
    // eslint-disable-next-line no-console
    console.log(`[email:${maskEmail(to)}] ${subject} — ${text.slice(0, 160)}`);
    return 'console-email';
  }
  // SendGrid stub (no hard dependency): best-effort fetch, fallback to console.
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { email: cfg.SENDGRID_FROM_EMAIL },
        personalizations: [{ to: [{ email: to }] }],
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    });
    if (!res.ok) throw new Error(`SendGrid ${res.status}`);
    return 'sendgrid';
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[email-fallback:${maskEmail(to)}] ${subject}`);
    return 'console-fallback';
  }
}

async function sendSms(to: string, text: string) {
  const cfg = getConfig();
  const provider = cfg.NOTIFICATION_PROVIDER;
  if (provider === 'console' || provider === 'sendgrid' || !cfg.TWILIO_ACCOUNT_SID) {
    // eslint-disable-next-line no-console
    console.log(`[sms:${maskPhone(to)}] ${text.slice(0, 160)}`);
    return 'console-sms';
  }
  // Twilio stub: real call would POST to api.twilio.com; keep console fallback.
  // eslint-disable-next-line no-console
  console.log(`[sms:${maskPhone(to)}] ${text.slice(0, 160)}`);
  return 'console-sms';
}

export async function notifyAppointment(
  appointmentId: string,
  type: NotifyType,
  opts?: { toEmail?: string; toPhone?: string; whenIst?: string; doctorName?: string }
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: true },
  });
  if (!appt) return;

  const optedIn = await commsOptedIn(appt.patientId);
  if (!optedIn) {
    await log(appointmentId, 'CONSOLE', type, 'QUEUED', 'opted-out');
    return;
  }

  const email = opts?.toEmail ?? appt.patient.email;
  const phone = opts?.toPhone ?? appt.patient.phone;
  const when = opts?.whenIst ?? appt.startsAt.toISOString();
  const doc = opts?.doctorName ?? appt.doctor.name;

  const subjects: Record<NotifyType, string> = {
    BOOKING_CONFIRMED: 'Appointment confirmed',
    RESCHEDULED: 'Appointment rescheduled',
    CANCELLED: 'Appointment cancelled',
    REMINDER_24H: 'Reminder: appointment in 24 hours',
    REMINDER_2H: 'Reminder: appointment in 2 hours',
    DOCTOR_NEW_BOOKING: 'New booking received',
  };
  const body = `${subjects[type]}: ${doc} at ${when} (IST). ID ${appointmentId}.`;

  await log(appointmentId, 'CONSOLE', type, 'QUEUED');
  const emailId = await sendEmail(email, subjects[type], body);
  await log(appointmentId, 'EMAIL', type, 'SENT', String(emailId));
  const smsId = await sendSms(phone, body);
  await log(appointmentId, 'SMS', type, 'SENT', String(smsId));
}
