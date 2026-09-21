import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBookAppointment, useConsents } from '../api/hooks.js';
import { formatIST } from '../api/client.js';
import { ApiError } from '../api/client.js';

interface Pending { doctorId: string; hospitalId: string; affiliationId: string; startsAt: string; endsAt: string }

export function BookingConfirm() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const raw = sessionStorage.getItem('pendingBooking');
  const pending = raw ? (JSON.parse(raw) as Pending) : null;
  const [reason, setReason] = useState('');
  const [doneId, setDoneId] = useState('');
  const [error, setError] = useState('');
  const book = useBookAppointment();
  const { data: consents } = useConsents();
  const hasCare = (consents ?? []).some((c) => c.purpose === 'MEDICAL_CARE' && !c.withdrawnAt);

  if (doneId) {
    return (
      <Box>
        <Alert severity="success">{t('booking.confirmed')} A confirmation email/SMS was queued.</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => nav('/bookings')}>{t('nav.bookings')}</Button>
      </Box>
    );
  }

  if (!pending) {
    return <Alert severity="info">No slot selected. <Button onClick={() => nav('/doctors')}>{t('doctors.title')}</Button></Alert>;
  }

  const confirm = async () => {
    setError('');
    try {
      const appt = await book.mutateAsync({ doctorId: pending.doctorId, hospitalId: pending.hospitalId, affiliationId: pending.affiliationId, startsAt: pending.startsAt, reason: reason || undefined });
      sessionStorage.removeItem('pendingBooking');
      setDoneId(appt.id);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.code}: ${e.message}` : 'Booking failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>{t('booking.title')}</Typography>
      <Typography>Slot (IST): <strong>{formatIST(pending.startsAt)}</strong></Typography>
      <Typography variant="body2" color="text.secondary">{t('booking.cutoffNote')}</Typography>
      {consents && !hasCare && <Alert severity="error" sx={{ mt: 1 }}>{t('booking.blocked') ?? t('consents.blocked')}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      <Stack spacing={2} sx={{ mt: 2 }}>
        <TextField label={t('booking.reason')} value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline minRows={2} />
        <Button variant="contained" onClick={() => void confirm()} disabled={book.isPending}>{t('booking.confirm')}</Button>
      </Stack>
    </Box>
  );
}
