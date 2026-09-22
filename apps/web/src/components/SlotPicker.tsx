import { useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Slot } from '../api/types.js';
import { formatIST, formatISTDay } from '../api/client.js';
import { Empty } from './States.js';

/** Groups UTC slots by IST calendar day; emits the chosen slot. */
export function SlotPicker({ slots, onPick, picked, loading, loadError, onRetry }: { slots: Slot[]; onPick: (s: Slot) => void; picked?: Slot | null; loading?: boolean; loadError?: boolean; onRetry?: () => void }) {
  const { t } = useTranslation();
  const groups = useMemo(() => {
    const map = new Map<string, Slot[]>();
    const sorted = [...slots].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    for (const s of sorted) {
      const day = formatISTDay(s.startsAt);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    }
    return [...map.entries()];
  }, [slots]);
  const [dayIdx, setDayIdx] = useState(0);
  const safeDayIdx = Math.min(dayIdx, Math.max(0, groups.length - 1));
  if (loading) return <Typography role="status">{t('common.loading')}</Typography>;
  if (loadError) return <Box><Typography color="error">Failed to load slots.</Typography>{onRetry && <Button onClick={onRetry}>{t('common.retry')}</Button>}</Box>;
  if (slots.length === 0) return <Empty text={t('doctors.noSlots')} />;
  const active = groups[safeDayIdx];

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }} role="tablist" aria-label="Available days">
        {groups.map(([day], i) => (
          <Chip
            key={day}
            label={day}
            clickable
            color={i === safeDayIdx ? 'primary' : 'default'}
            onClick={() => setDayIdx(i)}
            aria-pressed={i === safeDayIdx}
            role="tab"
            aria-selected={i === safeDayIdx}
          />
        ))}
      </Stack>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>{active[0]} (IST)</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        {active[1].map((s) => (
          <Button
            key={s.startsAt + s.affiliationId}
            size="small"
            variant={picked?.startsAt === s.startsAt && picked?.affiliationId === s.affiliationId ? 'contained' : 'outlined'}
            onClick={() => onPick(s)}
            aria-pressed={picked?.startsAt === s.startsAt && picked?.affiliationId === s.affiliationId}
            aria-label={`Book slot ${formatIST(s.startsAt, { hour: '2-digit', minute: '2-digit', hour12: true })} IST`}
          >
            {formatIST(s.startsAt, { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
