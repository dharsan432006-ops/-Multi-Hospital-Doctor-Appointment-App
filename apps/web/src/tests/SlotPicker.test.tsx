import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../i18n/index.js';
import { SlotPicker } from '../components/SlotPicker.js';

function renderPicker(slots: { affiliationId: string; hospitalId: string; startsAt: string; endsAt: string }[]) {
  const onPick = vi.fn();
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <SlotPicker slots={slots} onPick={onPick} picked={null} />
    </QueryClientProvider>
  );
  return onPick;
}

describe('SlotPicker', () => {
  it('groups slots by IST day and picks a slot', () => {
    // Tue 2026-09-22 10:00 IST = 04:30Z; Wed 10:00 IST = 04:30Z next day
    const onPick = renderPicker([
      { affiliationId: 'a', hospitalId: 'h', startsAt: '2026-09-22T04:30:00.000Z', endsAt: '2026-09-22T04:50:00.000Z' },
      { affiliationId: 'a', hospitalId: 'h', startsAt: '2026-09-22T04:50:00.000Z', endsAt: '2026-09-22T05:10:00.000Z' },
      { affiliationId: 'a', hospitalId: 'h', startsAt: '2026-09-23T04:30:00.000Z', endsAt: '2026-09-23T04:50:00.000Z' },
    ]);
    // Day chips + slot time buttons; slot buttons contain ':' (e.g. "10:00 am")
    const slotBtns = screen.getAllByRole('button').filter((b) => (b.textContent ?? '').includes(':'));
    expect(slotBtns.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(slotBtns[0]);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0].startsAt).toContain('2026-09-22');
  });

  it('shows empty state when no slots', () => {
    renderPicker([]);
    expect(screen.getByText(/no bookable slots/i)).toBeInTheDocument();
  });
});
