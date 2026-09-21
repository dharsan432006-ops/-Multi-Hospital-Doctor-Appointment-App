import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogTitle, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAvailability } from '../api/hooks.js';
import { useCancelAppointment, useMyBookings, useRescheduleAppointment } from '../api/hooks.js';
import { SlotPicker } from '../components/SlotPicker.js';
import { Empty, Loading, LoadError } from '../components/States.js';
import { formatIST } from '../api/client.js';
import type { Appointment, Slot } from '../api/types.js';

export function MyBookings() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useMyBookings();
  const cancel = useCancelAppointment();
  const reschedule = useRescheduleAppointment();
  const [confirmId, setConfirmId] = useState('');
  const [resched, setResched] = useState<Appointment | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [msg, setMsg] = useState('');

  const { data: slots } = useAvailability(resched?.doctorId, resched?.affiliation ? undefined : undefined);

  if (isLoading) return <Loading />;
  if (isError) return <LoadError message="Failed to load" onRetry={() => void refetch()} />;

  const doCancel = async () => {
    try {
      await cancel.mutateAsync(confirmId);
      setMsg(t('booking.cancelled'));
      setConfirmId('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Cancel failed');
    }
  };

  const doReschedule = async () => {
    if (!resched || !picked) return;
    try {
      await reschedule.mutateAsync({ id: resched.id, startsAt: picked.startsAt });
      setMsg('Rescheduled');
      setResched(null);
      setPicked(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Reschedule failed');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('nav.bookings')}</Typography>
      {msg && <Alert severity="info" sx={{ mb: 1 }}>{msg}</Alert>}
      {data && data.data.length === 0 && <Empty />}
      <Stack spacing={2}>
        {data?.data.map((a) => (
          <Card key={a.id}>
            <CardContent>
              <Typography variant="h6">{a.doctor?.name} · {a.doctor?.specialty}</Typography>
              <Typography>{a.affiliation?.hospital.name}</Typography>
              <Typography>IST: {formatIST(a.startsAt)} – {formatIST(a.endsAt, { hour: '2-digit', minute: '2-digit', hour12: true })}</Typography>
              <Typography variant="body2" color="text.secondary">Status: {a.status}</Typography>
              {['PENDING', 'CONFIRMED'].includes(a.status) && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" color="error" onClick={() => setConfirmId(a.id)}>Cancel</Button>
                  <Button size="small" onClick={() => { setResched(a); setPicked(null); }}>{t('booking.reschedule')}</Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Dialog open={!!confirmId} onClose={() => setConfirmId('')}>
        <DialogTitle>{t('booking.cancelTitle')}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmId('')}>{t('common.cancel')}</Button>
          <Button color="error" onClick={() => void doCancel()}>{t('booking.cancelOk')}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!resched} onClose={() => setResched(null)} maxWidth="md" fullWidth>
        <DialogTitle>{t('booking.reschedule')}</DialogTitle>
        <Box sx={{ p: 2 }}>
          <SlotPicker slots={slots ?? []} picked={picked} onPick={setPicked} />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button onClick={() => setResched(null)}>{t('common.cancel')}</Button>
            <Button variant="contained" disabled={!picked} onClick={() => void doReschedule()}>{t('booking.reschedule')}</Button>
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
}
