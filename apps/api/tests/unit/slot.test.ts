import { describe, it, expect } from 'vitest';
import {
  canCancel,
  isSlotCovered,
  slotsForRuleOnDate,
  overlaps,
} from '../../src/services/slot.service.js';

describe('slot generation from AvailabilityRule', () => {
  it('expands Mon 10:00-16:00 @20min into 18 UTC slots', () => {
    // Monday 2026-09-21 (IST)
    const slots = slotsForRuleOnDate(2026, 8, 21, {
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '16:00',
      slotMinutes: 20,
    });
    expect(slots).toHaveLength(18);
    // 10:00 IST = 04:30 UTC; last start 15:40 IST = 10:10 UTC
    expect(slots[0].startsAt.toISOString()).toBe('2026-09-21T04:30:00.000Z');
    expect(slots[17].startsAt.toISOString()).toBe('2026-09-21T10:10:00.000Z');
  });

  it('rejects slots outside hours and honours time-off', () => {
    const rules = [{ dayOfWeek: 1, startTime: '10:00', endTime: '16:00', slotMinutes: 20 }];
    const okStart = new Date('2026-09-21T04:30:00.000Z'); // Mon 10:00 IST
    const okEnd = new Date('2026-09-21T04:50:00.000Z');
    expect(isSlotCovered(okStart, okEnd, rules, [])).toBe(true);

    const sundayStart = new Date('2026-09-20T04:30:00.000Z'); // Sun
    const sundayEnd = new Date('2026-09-20T04:50:00.000Z');
    expect(isSlotCovered(sundayStart, sundayEnd, rules, [])).toBe(false);

    const off = [{ startsAt: new Date('2026-09-21T04:00:00.000Z'), endsAt: new Date('2026-09-21T05:00:00.000Z') }];
    expect(isSlotCovered(okStart, okEnd, rules, off)).toBe(false);
  });

  it('detects interval overlaps', () => {
    const a = new Date('2026-09-21T04:30:00Z');
    const b = new Date('2026-09-21T04:50:00Z');
    const c = new Date('2026-09-21T04:40:00Z');
    const d = new Date('2026-09-21T05:00:00Z');
    expect(overlaps(a, b, c, d)).toBe(true);
    expect(overlaps(a, b, b, d)).toBe(false); // touching edges
  });

  it('enforces cancellation cutoff (default 2h)', () => {
    const start = new Date('2026-09-21T10:00:00Z');
    expect(canCancel(start, new Date('2026-09-21T07:59:00Z'), 2)).toBe(true);
    expect(canCancel(start, new Date('2026-09-21T08:01:00Z'), 2)).toBe(false);
  });
});
