import { describe, it, expect } from 'vitest';
import {
  findCoveringRule,
  isSlotAligned,
  isSlotCovered,
} from '../../src/services/slot.service.js';
import {
  STATUS_TRANSITIONS,
  assertValidTransition,
} from '../../src/services/booking.service.js';

const RULES_20 = [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00', slotMinutes: 20 }];

describe('slot-grid alignment (20-min rule from 09:00 IST, Monday 2026-09-21)', () => {
  // 09:00 IST = 03:30 UTC; 09:20 IST = 03:50 UTC; 09:40 IST = 04:10 UTC
  it('accepts aligned starts 09:00 / 09:20 / 09:40', () => {
    for (const [s, e] of [
      ['2026-09-21T03:30:00.000Z', '2026-09-21T03:50:00.000Z'],
      ['2026-09-21T03:50:00.000Z', '2026-09-21T04:10:00.000Z'],
      ['2026-09-21T04:10:00.000Z', '2026-09-21T04:30:00.000Z'],
    ]) {
      const startsAt = new Date(s);
      const endsAt = new Date(e);
      expect(isSlotAligned(startsAt, endsAt, RULES_20)).toBe(true);
      expect(isSlotCovered(startsAt, endsAt, RULES_20, [])).toBe(true);
      expect(findCoveringRule(startsAt, endsAt, RULES_20)).not.toBeNull();
    }
  });

  it('rejects off-grid starts 09:07 / 09:13 / 09:35', () => {
    for (const [s, e] of [
      ['2026-09-21T03:37:00.000Z', '2026-09-21T03:57:00.000Z'], // 09:07 IST
      ['2026-09-21T03:43:00.000Z', '2026-09-21T04:03:00.000Z'], // 09:13 IST
      ['2026-09-21T04:05:00.000Z', '2026-09-21T04:25:00.000Z'], // 09:35 IST
    ]) {
      const startsAt = new Date(s);
      const endsAt = new Date(e);
      expect(isSlotAligned(startsAt, endsAt, RULES_20)).toBe(false);
      expect(isSlotCovered(startsAt, endsAt, RULES_20, [])).toBe(false);
    }
  });

  it('rejects wrong duration and non-zero seconds', () => {
    const ok = new Date('2026-09-21T03:30:00.000Z');
    const badDur = new Date('2026-09-21T03:45:00.000Z'); // 15 min
    expect(isSlotAligned(ok, badDur, RULES_20)).toBe(false);
    const withSecs = new Date('2026-09-21T03:30:30.000Z');
    const withSecsEnd = new Date('2026-09-21T03:50:30.000Z');
    expect(isSlotAligned(withSecs, withSecsEnd, RULES_20)).toBe(false);
  });
});

describe('appointment state machine', () => {
  it('exposes the documented lifecycle', () => {
    expect(STATUS_TRANSITIONS.PENDING.sort()).toEqual(['CANCELLED', 'CONFIRMED']);
    expect(STATUS_TRANSITIONS.CONFIRMED.sort()).toEqual(['CANCELLED', 'COMPLETED', 'NO_SHOW']);
    expect(STATUS_TRANSITIONS.COMPLETED).toEqual([]);
    expect(STATUS_TRANSITIONS.NO_SHOW).toEqual([]);
    expect(STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('accepts every valid transition', () => {
    expect(() => assertValidTransition('PENDING', 'CONFIRMED')).not.toThrow();
    expect(() => assertValidTransition('PENDING', 'CANCELLED')).not.toThrow();
    expect(() => assertValidTransition('CONFIRMED', 'COMPLETED')).not.toThrow();
    expect(() => assertValidTransition('CONFIRMED', 'NO_SHOW')).not.toThrow();
    expect(() => assertValidTransition('CONFIRMED', 'CANCELLED')).not.toThrow();
  });

  it('rejects invalid transitions incl. un-cancel and completed regress', () => {
    for (const [from, to] of [
      ['CANCELLED', 'CONFIRMED'],
      ['COMPLETED', 'CONFIRMED'],
      ['PENDING', 'COMPLETED'],
      ['PENDING', 'NO_SHOW'],
      ['COMPLETED', 'CANCELLED'],
      ['NO_SHOW', 'CONFIRMED'],
      ['CONFIRMED', 'PENDING'],
    ]) {
      let err: unknown = null;
      try {
        assertValidTransition(from, to);
      } catch (e) {
        err = e;
      }
      expect(err).toBeTruthy();
      expect((err as { code?: string }).code).toBe('INVALID_STATUS_TRANSITION');
      expect((err as { status?: number }).status).toBe(400);
    }
  });
});
