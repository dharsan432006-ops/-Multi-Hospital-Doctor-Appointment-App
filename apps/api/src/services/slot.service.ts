/**
 * Slot generation in Asia/Kolkata (IST, UTC+5:30, no DST).
 * All display in IST; storage in UTC.
 */
export const IST_OFFSET_MIN = 5 * 60 + 30;
export const MAX_AVAILABILITY_DAYS = 30;

export interface RuleLike {
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // "HH:mm" IST
  endTime: string;
  slotMinutes: number;
}

export function timeToMinutes(t: string): number {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Invalid time ${t}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** IST calendar days between two dates (inclusive helpers). */
export function istDateParts(d: Date): { y: number; mo: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const [y, mo, day] = parts.split('-').map(Number);
  return { y, mo: mo - 1, day };
}

export function istMidnightUtcMillis(d: Date): number {
  const { y, mo, day } = istDateParts(d);
  return Date.UTC(y, mo, day);
}

export function istWeekday(d: Date): number {
  return new Date(istMidnightUtcMillis(d)).getUTCDay();
}

export function istSlotToUtc(y: number, mo: number, day: number, hhMm: string): Date {
  const [hh, mm] = hhMm.split(':').map(Number);
  return new Date(Date.UTC(y, mo, day, hh, mm, 0) - IST_OFFSET_MIN * 60_000);
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
}

/** Pure: expand one rule on one IST date into UTC slots. */
export function slotsForRuleOnDate(
  y: number,
  mo: number,
  day: number,
  rule: RuleLike
): Slot[] {
  const startMin = timeToMinutes(rule.startTime);
  const endMin = timeToMinutes(rule.endTime);
  const len = rule.slotMinutes ?? 20;
  const out: Slot[] = [];
  for (let m = startMin; m + len <= endMin; m += len) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const startsAt = istSlotToUtc(y, mo, day, `${hh}:${mm}`);
    out.push({ startsAt, endsAt: new Date(startsAt.getTime() + len * 60_000) });
  }
  return out;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** Pure: is a slot inside any rule and outside all time-offs? */
export function findCoveringRule(startsAt: Date, endsAt: Date, rules: RuleLike[]): RuleLike | null {
  const ist = new Date(startsAt.getTime() + IST_OFFSET_MIN * 60_000);
  const dow = ist.getUTCDay();
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  // Reject slots that are not on exact minute boundaries (seconds/millis must be zero).
  if (startsAt.getUTCSeconds() !== 0 || startsAt.getUTCMilliseconds() !== 0) return null;
  if (ist.getUTCSeconds() !== 0) return null;
  const durMin = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
  for (const r of rules) {
    if (r.dayOfWeek !== dow) continue;
    const s = timeToMinutes(r.startTime);
    const e = timeToMinutes(r.endTime);
    const len = r.slotMinutes ?? 20;
    if (durMin !== len) continue;
    if (mins < s || mins + durMin > e) continue;
    // Strict grid alignment: offset from rule start must be a multiple of slotMinutes.
    if ((mins - s) % len !== 0) continue;
    return r;
  }
  return null;
}

/** Pure: strict slot-grid alignment check (09:00/09:20/09:40 for 20-min rules, etc). */
export function isSlotAligned(startsAt: Date, endsAt: Date, rules: RuleLike[]): boolean {
  return findCoveringRule(startsAt, endsAt, rules) !== null;
}

export function isSlotCovered(
  startsAt: Date,
  endsAt: Date,
  rules: RuleLike[],
  timeOffs: { startsAt: Date; endsAt: Date }[]
): boolean {
  // Convert slot start to IST wall-clock to match rules
  const ist = new Date(startsAt.getTime() + IST_OFFSET_MIN * 60_000);
  const dow = ist.getUTCDay();
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const durMin = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);

  const inRule = rules.some((r) => {
    if (r.dayOfWeek !== dow) return false;
    const s = timeToMinutes(r.startTime);
    const e = timeToMinutes(r.endTime);
    const len = r.slotMinutes ?? 20;
    if (durMin !== len) return false;
    if (mins < s || mins + durMin > e) return false;
    // Strict grid alignment.
    if ((mins - s) % len !== 0) return false;
    return true;
  });
  if (!inRule) return false;
  return !timeOffs.some((t) => overlaps(startsAt, endsAt, t.startsAt, t.endsAt));
}

/** Pure: cancellation allowed if now is at least cutoffHours before start? */
export function canCancel(startsAt: Date, now: Date, cutoffHours: number): boolean {
  return now.getTime() <= startsAt.getTime() - cutoffHours * 3600_000;
}
