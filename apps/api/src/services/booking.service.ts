import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { getConfig } from '../config/config.js';
import {
  MAX_AVAILABILITY_DAYS,
  canCancel,
  findCoveringRule,
  isSlotCovered,
  istMidnightUtcMillis,
  overlaps,
  slotsForRuleOnDate,
} from './slot.service.js';
import { enqueueAppointmentEvent, scheduleReminders } from '../jobs/queues.js';

/** Explicit appointment lifecycle. Terminal states accept no further transitions. */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

export function assertValidTransition(from: string, to: string) {
  if (from === to) return;
  const allowed = STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition appointment from ${from} to ${to}`
    );
  }
}

/** Resolve affiliation for doctor+hospital, ensuring department link. */
async function resolveAffiliation(doctorId: string, hospitalId: string | undefined, affiliationId: string | undefined) {
  if (affiliationId) {
    const aff = await prisma.doctorAffiliation.findUnique({
      where: { id: affiliationId },
      include: { availabilityRules: true, hospital: true },
    });
    if (!aff || aff.doctorId !== doctorId) {
      throw ApiError.badRequest('INVALID_AFFILIATION', 'Doctor is not affiliated as specified');
    }
    if (hospitalId && aff.hospitalId !== hospitalId) {
      throw ApiError.badRequest('HOSPITAL_MISMATCH', 'Affiliation does not match hospitalId');
    }
    return aff;
  }
  if (!hospitalId) throw ApiError.badRequest('HOSPITAL_REQUIRED', 'hospitalId or affiliationId required');
  const aff = await prisma.doctorAffiliation.findUnique({
    where: { doctorId_hospitalId: { doctorId, hospitalId } },
    include: { availabilityRules: true, hospital: true },
  });
  if (!aff) throw ApiError.badRequest('NOT_AFFILIATED', 'Doctor is not affiliated with this hospital');
  return aff;
}

async function requireMedicalConsent(userId: string) {
  const rec = await prisma.consentRecord.findUnique({
    where: {
      userId_purpose_policyVersion: { userId, purpose: 'MEDICAL_CARE' as never, policyVersion: 'v1.0' },
    },
  });
  if (!rec || rec.withdrawnAt) {
    throw ApiError.forbidden('CONSENT_REQUIRED', 'MEDICAL_CARE consent is required to book');
  }
}

export async function getAvailability(doctorId: string, hospitalId: string | undefined, from: string | undefined, to: string | undefined) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw ApiError.notFound('DOCTOR_NOT_FOUND', 'Doctor not found');

  const now = new Date();
  const start = from ? new Date(from) : now;
  const endDefault = new Date(now.getTime() + MAX_AVAILABILITY_DAYS * 86_400_000);
  const end = to ? new Date(to) : endDefault;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw ApiError.badRequest('INVALID_DATE', 'Invalid from/to date');
  }
  if (end.getTime() < start.getTime()) {
    throw ApiError.badRequest('INVALID_DATE_RANGE', 'to must be after from');
  }
  if (end.getTime() - start.getTime() > (MAX_AVAILABILITY_DAYS + 1) * 86_400_000) {
    throw ApiError.badRequest('RANGE_TOO_WIDE', `Availability window is max ${MAX_AVAILABILITY_DAYS} days`);
  }

  const affs = await prisma.doctorAffiliation.findMany({
    where: { doctorId, ...(hospitalId ? { hospitalId } : {}) },
    include: { availabilityRules: true },
  });
  const activeAffs = affs.filter((a) => !a.schedulePending && a.availabilityRules.length > 0);
  if (activeAffs.length === 0) return [];

  const timeOffs = await prisma.timeOff.findMany({
    where: { doctorId, endsAt: { gte: start }, startsAt: { lte: end } },
  });
  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: ['PENDING', 'CONFIRMED'] as never },
      startsAt: { lte: end },
      endsAt: { gte: start },
    },
    select: { startsAt: true, endsAt: true },
  });

  const slots: { affiliationId: string; hospitalId: string; startsAt: Date; endsAt: Date }[] = [];
  // Iterate IST calendar days
  const startMid = istMidnightUtcMillis(start < now ? now : start);
  const endMid = istMidnightUtcMillis(end);
  for (let dayMs = startMid; dayMs <= endMid; dayMs += 86_400_000) {
    const d = new Date(dayMs);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const day = d.getUTCDate();
    const dow = d.getUTCDay();
    for (const aff of activeAffs) {
      for (const rule of aff.availabilityRules.filter((r) => r.dayOfWeek === dow)) {
        for (const s of slotsForRuleOnDate(y, mo, day, rule)) {
          if (s.endsAt <= now || s.startsAt < start || s.startsAt > end) continue;
          if (timeOffs.some((t) => overlaps(s.startsAt, s.endsAt, t.startsAt, t.endsAt))) continue;
          if (booked.some((b) => overlaps(s.startsAt, s.endsAt, b.startsAt, b.endsAt))) continue;
          slots.push({ affiliationId: aff.id, hospitalId: aff.hospitalId, startsAt: s.startsAt, endsAt: s.endsAt });
        }
      }
    }
  }
  slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const MAX_SLOTS = 500;
  const capped = slots.slice(0, MAX_SLOTS);
  return capped.map((s) => ({
    affiliationId: s.affiliationId,
    hospitalId: s.hospitalId,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
  }));
}

export async function bookAppointment(input: {
  patientId: string;
  patientUserId: string;
  doctorId: string;
  hospitalId?: string;
  affiliationId?: string;
  startsAt: string;
  reason?: string;
  idempotencyKey?: string;
}) {
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw ApiError.badRequest('INVALID_DATE', 'Invalid startsAt');
  if (startsAt.getTime() < Date.now() + 60_000) {
    throw ApiError.badRequest('SLOT_IN_PAST', 'Slot must be in the future');
  }

  // Idempotency: same patient + key returns existing booking.
  if (input.idempotencyKey) {
    const existing = await prisma.appointment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.patientId !== input.patientId) {
        throw ApiError.conflict('IDEMPOTENCY_CONFLICT', 'Idempotency key already used');
      }
      return existing;
    }
  }

  await requireMedicalConsent(input.patientUserId);

  let created;
  try {
    created = await prisma.$transaction(
      async (tx) => {
      const aff = await resolveAffiliation(input.doctorId, input.hospitalId, input.affiliationId);
      if (aff.schedulePending) {
        throw ApiError.badRequest('SCHEDULE_PENDING', 'Doctor schedule pending at this hospital');
      }
      const rules = await tx.availabilityRule.findMany({ where: { affiliationId: aff.id } });
      const timeOffs = await tx.timeOff.findMany({ where: { doctorId: input.doctorId } });

      // Slot length from matching rule (first covering rule sets endsAt if client omitted it)
      const ist = new Date(startsAt.getTime() + 5.5 * 3600_000);
      const dow = ist.getUTCDay();
      const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
      const rule = rules.find((r) => {
        if (r.dayOfWeek !== dow) return false;
        const [sh, sm] = r.startTime.split(':').map(Number);
        const [eh, em] = r.endTime.split(':').map(Number);
        return mins >= sh * 60 + sm && mins + r.slotMinutes <= eh * 60 + em;
      });
      if (!rule) throw ApiError.badRequest('SLOT_OUTSIDE_HOURS', 'Slot is outside consultation hours');
      // Strict grid alignment: e.g. 09:07 rejected for 20-min rules starting 09:00.
      const [rsh, rsm] = rule.startTime.split(':').map(Number);
      if ((mins - (rsh * 60 + rsm)) % rule.slotMinutes !== 0) {
        throw ApiError.badRequest('INVALID_SLOT_ALIGNMENT', 'Slot start is not on the schedule grid');
      }
      const endsAt = new Date(startsAt.getTime() + rule.slotMinutes * 60_000);
      if (!findCoveringRule(startsAt, endsAt, rules)) {
        throw ApiError.badRequest('INVALID_SLOT_ALIGNMENT', 'Slot start is not on the schedule grid');
      }

      if (!isSlotCovered(startsAt, endsAt, rules, timeOffs)) {
        throw ApiError.badRequest('SLOT_UNAVAILABLE', 'Slot unavailable (time-off or outside hours)');
      }

      // Cross-hospital overlap for same doctor (any affiliation), active only.
      const clash = await tx.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          status: { in: ['PENDING', 'CONFIRMED'] as never },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });
      if (clash) throw ApiError.conflict('DOCTOR_UNAVAILABLE', 'Doctor already booked at this time');

      try {
        return await tx.appointment.create({
          data: {
            patientId: input.patientId,
            doctorId: input.doctorId,
            affiliationId: aff.id,
            startsAt,
            endsAt,
            status: 'CONFIRMED' as never,
            reason: input.reason?.slice(0, 500) ?? null,
            idempotencyKey: input.idempotencyKey ?? null,
          },
        });
      } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002') {
          throw ApiError.conflict('SLOT_TAKEN', 'Slot just got booked, pick another');
        }
        throw e;
      }
      },
      { isolationLevel: 'Serializable', timeout: 10_000 }
    );
  } catch (e: unknown) {
    if (e instanceof ApiError) throw e;
    if (typeof e === 'object' && e !== null && 'code' in e) {
      const code = (e as { code: string }).code;
      // Serializable serialization failure under concurrency, or unique violation race.
      if (code === 'P2034' || code === 'P2002') {
        throw ApiError.conflict('SLOT_TAKEN', 'Slot just got booked, pick another');
      }
    }
    throw e;
  }

  await enqueueAppointmentEvent(created.id, 'BOOKING_CONFIRMED');
  await scheduleReminders(created.id, created.startsAt);
  return created;
}

export async function cancelAppointment(input: {
  appointmentId: string;
  actor: { id: string; role: string };
  cancelledBy?: string;
}) {
  const appt = await prisma.appointment.findUnique({ where: { id: input.appointmentId } });
  if (!appt) throw ApiError.notFound('APPOINTMENT_NOT_FOUND', 'Appointment not found');

  const cfg = getConfig();
  const isOwnerPatient =
    input.actor.role === 'PATIENT' &&
    (await prisma.patient.findFirst({ where: { id: appt.patientId, userId: input.actor.id } }));
  if (input.actor.role === 'PATIENT' && !isOwnerPatient) {
    throw ApiError.forbidden('NOT_YOUR_BOOKING', 'Not your booking');
  }
  if (input.actor.role === 'DOCTOR') {
    const doc = await prisma.doctor.findFirst({ where: { id: appt.doctorId, userId: input.actor.id } });
    if (!doc) throw ApiError.forbidden('NOT_YOUR_APPOINTMENT', 'Not your appointment');
  }
  if (appt.status === 'CANCELLED') return appt;
  if (['COMPLETED', 'NO_SHOW'].includes(appt.status)) {
    throw ApiError.badRequest('ALREADY_CLOSED', `Cannot cancel a ${appt.status} appointment`);
  }

  // Cutoff applies to patients; staff can cancel anytime (still logged).
  if (input.actor.role === 'PATIENT' && !canCancel(appt.startsAt, new Date(), cfg.CANCELLATION_CUTOFF_HOURS)) {
    throw ApiError.badRequest('CANCELLATION_CUTOFF', `Cancellation allowed up to ${cfg.CANCELLATION_CUTOFF_HOURS}h before`);
  }

  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: 'CANCELLED' as never, cancelledAt: new Date(), cancelledBy: input.cancelledBy ?? input.actor.role },
  });
  await enqueueAppointmentEvent(updated.id, 'CANCELLED');
  return updated;
}

export async function rescheduleAppointment(input: {
  appointmentId: string;
  newStartsAt: string;
  actor: { id: string; role: string };
}) {
  const appt = await prisma.appointment.findUnique({ where: { id: input.appointmentId } });
  if (!appt) throw ApiError.notFound('APPOINTMENT_NOT_FOUND', 'Appointment not found');
  if (['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(appt.status)) {
    throw ApiError.badRequest('CANNOT_RESCHEDULE', `Cannot reschedule a ${appt.status} appointment`);
  }
  const newStartsAt = new Date(input.newStartsAt);
  if (Number.isNaN(newStartsAt.getTime()) || newStartsAt.getTime() < Date.now() + 60_000) {
    throw ApiError.badRequest('INVALID_SLOT', 'New slot must be in the future');
  }

  if (input.actor.role === 'PATIENT') {
    const owner = await prisma.patient.findFirst({ where: { id: appt.patientId, userId: input.actor.id } });
    if (!owner) throw ApiError.forbidden('NOT_YOUR_BOOKING', 'Not your booking');
    const cfg = getConfig();
    if (!canCancel(appt.startsAt, new Date(), cfg.CANCELLATION_CUTOFF_HOURS)) {
      throw ApiError.badRequest('RESCHEDULE_CUTOFF', 'Reschedule past the cancellation cutoff');
    }
  } else if (input.actor.role === 'DOCTOR') {
    const doc = await prisma.doctor.findFirst({ where: { userId: input.actor.id } });
    if (!doc || appt.doctorId !== doc.id) {
      throw ApiError.forbidden('NOT_YOUR_APPOINTMENT', 'Not your appointment');
    }
  }
  // ADMIN bypasses ownership (administrative reschedule), still subject to slot rules below.

  let updated;
  try {
    updated = await prisma.$transaction(
      async (tx) => {
        const rules = await tx.availabilityRule.findMany({ where: { affiliationId: appt.affiliationId } });
        const timeOffs = await tx.timeOff.findMany({ where: { doctorId: appt.doctorId } });
        const ist = new Date(newStartsAt.getTime() + 5.5 * 3600_000);
        const dow = ist.getUTCDay();
        const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
        const rule = rules.find((r) => {
          if (r.dayOfWeek !== dow) return false;
          const [sh, sm] = r.startTime.split(':').map(Number);
          const [eh, em] = r.endTime.split(':').map(Number);
          return mins >= sh * 60 + sm && mins + r.slotMinutes <= eh * 60 + em;
        });
        if (!rule) throw ApiError.badRequest('SLOT_OUTSIDE_HOURS', 'New slot outside consultation hours');
        const [nrsh, nrsm] = rule.startTime.split(':').map(Number);
        if ((mins - (nrsh * 60 + nrsm)) % rule.slotMinutes !== 0) {
          throw ApiError.badRequest('INVALID_SLOT_ALIGNMENT', 'New slot start is not on the schedule grid');
        }
        const newEndsAt = new Date(newStartsAt.getTime() + rule.slotMinutes * 60_000);
        if (!findCoveringRule(newStartsAt, newEndsAt, rules)) {
          throw ApiError.badRequest('INVALID_SLOT_ALIGNMENT', 'New slot start is not on the schedule grid');
        }
        if (!isSlotCovered(newStartsAt, newEndsAt, rules, timeOffs)) {
          throw ApiError.badRequest('SLOT_UNAVAILABLE', 'New slot unavailable');
        }
        const clash = await tx.appointment.findFirst({
          where: {
            doctorId: appt.doctorId,
            id: { not: appt.id },
            status: { in: ['PENDING', 'CONFIRMED'] as never },
            startsAt: { lt: newEndsAt },
            endsAt: { gt: newStartsAt },
          },
        });
        if (clash) throw ApiError.conflict('DOCTOR_UNAVAILABLE', 'Doctor already booked at new time');
        // Preserve existing status (PENDING stays PENDING); never silently upgrade.
        return tx.appointment.update({
          where: { id: appt.id },
          data: { startsAt: newStartsAt, endsAt: newEndsAt },
        });
      },
      { isolationLevel: 'Serializable', timeout: 10_000 }
    );
  } catch (e: unknown) {
    if (e instanceof ApiError) throw e;
    if (typeof e === 'object' && e !== null && 'code' in e) {
      const code = (e as { code: string }).code;
      if (code === 'P2034' || code === 'P2002') {
        throw ApiError.conflict('SLOT_TAKEN', 'Slot just got booked, pick another');
      }
    }
    throw e;
  }
  await enqueueAppointmentEvent(updated.id, 'RESCHEDULED');
  await scheduleReminders(updated.id, updated.startsAt);
  return updated;
}

export async function setAppointmentStatus(input: {
  appointmentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  actor?: { id: string; role: string };
}) {
  const appt = await prisma.appointment.findUnique({ where: { id: input.appointmentId } });
  if (!appt) throw ApiError.notFound('APPOINTMENT_NOT_FOUND', 'Appointment not found');
  if (appt.status === input.status) return appt;
  assertValidTransition(appt.status, input.status);
  // Cancellation via status endpoint must behave exactly like cancelAppointment.
  if (input.status === 'CANCELLED') {
    if (input.actor?.role === 'PATIENT') {
      const owner = await prisma.patient.findFirst({ where: { id: appt.patientId, userId: input.actor.id } });
      if (!owner) throw ApiError.forbidden('NOT_YOUR_BOOKING', 'Not your booking');
      const cfg = getConfig();
      if (!canCancel(appt.startsAt, new Date(), cfg.CANCELLATION_CUTOFF_HOURS)) {
        throw ApiError.badRequest('CANCELLATION_CUTOFF', `Cancellation allowed up to ${cfg.CANCELLATION_CUTOFF_HOURS}h before`);
      }
    }
    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: 'CANCELLED' as never, cancelledAt: new Date(), cancelledBy: input.actor?.role ?? 'STAFF' },
    });
    await enqueueAppointmentEvent(updated.id, 'CANCELLED');
    return updated;
  }
  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: input.status as never },
  });
  return updated;
}
