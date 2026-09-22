import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBookAppointment, useConsents } from '../api/hooks.js';
import { formatIST } from '../api/client.js';
import { ApiError } from '../api/client.js';

interface Pending { doctorId: string; hospitalId: string; affiliationId: string; startsAt: string; endsAt: string }

function readPending(): Pending | null {
  const raw = sessionStorage.getItem('pendingBooking');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Pending;
    if (!parsed || typeof parsed.doctorId !== 'string' || typeof parsed.startsAt !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function BookingConfirm() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [pending, setPending] = useState<Pending | null>(() => readPending());
  const [pendingBad, setPendingBad] = useState(false);
  const [reason, setReason] = useState('');
  const [doneId, setDoneId] = useState('');
  const [error, setError] = useState('');
  const book = useBookAppointment();
  const { data: consents, isLoading: consentsLoading } = useConsents();
  const hasCare = (consents ?? []).some((c) => c.purpose === 'MEDICAL_CARE' && !c.withdrawnAt);

  if (doneId) {
    return (
      <Box>
        <Alert severity="success">{t('booking.confirmed')} {t('booking.confirmHint')}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => nav('/bookings')}>{t('nav.bookings')}</Button>
      </Box>
    );
  }

  if (!pending) {
    return (
      <Alert severity={pendingBad ? 'error' : 'info'}>
        {t('booking.noSlot')} <Button onClick={() => nav('/doctors')}>{t('doctors.title')}</Button>
      </Alert>
    );
  }

  const confirm = async () => {
    if (book.isPending) return;
    setError('');
    // Validate stored slot before sending.
    if (!pending || Number.isNaN(new Date(pending.startsAt).getTime())) {
      setPendingBad(true);
      setPending(null);
      return;
    }
    try {
      const appt = await book.mutateAsync({ doctorId: pending.doctorId, hospitalId: pending.hospitalId, affiliationId: pending.affiliationId, startsAt: pending.startsAt, reason: reason || undefined });
      sessionStorage.removeItem('pendingBooking');
      setDoneId(appt.id);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.code}: ${e.message}` : 'Booking failed');
    }
  };

  const blocked = !consentsLoading && !hasCare;

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>{t('booking.title')}</Typography>
      <Typography>{t('booking.slotLabel')}: <strong>{formatIST(pending.startsAt)}</strong></Typography>
      <Typography variant="body2" color="text.secondary">{t('booking.cutoffNote')}</Typography>
      {consentsLoading && <Alert severity="info" sx={{ mt: 1 }}>{t('common.loading')}</Alert>}
      {blocked && <Alert severity="error" sx={{ mt: 1 }}>{t('consents.blocked')}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      <Stack spacing={2} sx={{ mt: 2 }}>
        <TextField label={t('booking.reason')} value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline minRows={2} />
        <Button variant="contained" onClick={() => void confirm()} disabled={book.isPending || blocked}>
          {book.isPending ? t('booking.confirming') : t('booking.confirm')}
        </Button>
      </Stack>
    </Box>
  );
}
