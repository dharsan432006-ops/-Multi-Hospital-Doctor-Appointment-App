import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogTitle, Stack, Typography, Tabs, Tab, Paper, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAvailability, useCancelAppointment, useMyBookings, useRescheduleAppointment } from '../api/hooks.js';
import { SlotPicker } from '../components/SlotPicker.js';
import { Empty, Loading, LoadError } from '../components/States.js';
import { formatIST } from '../api/client.js';
import { MedicalRecordsTimeline } from '../components/MedicalRecordsTimeline.js';
import type { Appointment, Slot } from '../api/types.js';

export function MyBookings() {
  const { t } = useTranslation();
  const [sectionTab, setSectionTab] = useState<'appointments' | 'records'>('appointments');
  const { data, isLoading, isError, refetch } = useMyBookings();
  const cancel = useCancelAppointment();
  const reschedule = useRescheduleAppointment();
  const [confirmId, setConfirmId] = useState('');
  const [resched, setResched] = useState<Appointment | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [msg, setMsg] = useState('');

  const { data: slots, isLoading: slotsLoading, isError: slotsError, refetch: refetchSlots } = useAvailability(
    resched?.doctorId,
    resched?.affiliation?.hospital.id
  );

  const doCancel = async () => {
    if (cancel.isPending) return;
    setMsg('');
    try {
      await cancel.mutateAsync(confirmId);
      setMsg(t('booking.cancelled'));
      setConfirmId('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Cancel failed');
    }
  };

  const doReschedule = async () => {
    if (!resched || !picked || reschedule.isPending) return;
    setMsg('');
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Patient Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your scheduled hospital consultations and access your complete digital medical history.
        </Typography>
      </Box>

      {/* Primary Section Switcher */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          bgcolor: 'white',
          p: 0.5,
        }}
      >
        <Tabs
          value={sectionTab}
          onChange={(_, val) => setSectionTab(val)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              borderRadius: 2,
              minHeight: 44,
            },
            '& .Mui-selected': {
              bgcolor: '#eef2ff',
              color: '#4f46e5 !important',
            },
          }}
        >
          <Tab
            value="appointments"
            label={`📅 Appointments & Bookings (${data?.data?.length || 0})`}
          />
          <Tab
            value="records"
            label="📋 Medical Records (Diagnoses, Allergies, Vaccines)"
          />
        </Tabs>
      </Paper>

      {sectionTab === 'records' ? (
        <MedicalRecordsTimeline />
      ) : (
        <Box>
          {msg && <Alert severity="info" sx={{ mb: 2 }}>{msg}</Alert>}
          {isLoading && <Loading />}
          {isError && <LoadError message="Failed to load appointments" onRetry={() => void refetch()} />}
          {data && data.data.length === 0 && <Empty />}
          <Stack spacing={2}>
            {data?.data.map((a) => (
              <Card
                key={a.id}
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.15s ease',
                  '&:hover': { borderColor: '#cbd5e1' },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 1, gap: 1 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {a.doctor?.name} · <span style={{ color: '#4f46e5', fontWeight: 600 }}>{a.doctor?.specialty}</span>
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        🏥 {a.affiliation?.hospital.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={a.status}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor:
                          a.status === 'CONFIRMED'
                            ? '#d1fae5'
                            : a.status === 'COMPLETED'
                            ? '#dbeafe'
                            : a.status === 'CANCELLED'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          a.status === 'CONFIRMED'
                            ? '#065f46'
                            : a.status === 'COMPLETED'
                            ? '#1e40af'
                            : a.status === 'CANCELLED'
                            ? '#991b1b'
                            : '#92400e',
                      }}
                    />
                  </Box>

                  <Typography variant="body2" sx={{ color: '#334155', mt: 1 }}>
                    ⏰ IST: <strong>{formatIST(a.startsAt)}</strong> – {formatIST(a.endsAt, { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Typography>

                  {['PENDING', 'CONFIRMED'].includes(a.status) && (
                    <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => { setMsg(''); setConfirmId(a.id); }}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => { setMsg(''); setResched(a); setPicked(null); }}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, bgcolor: '#4f46e5' }}
                      >
                        {t('booking.reschedule')}
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      <Dialog open={!!confirmId} onClose={() => setConfirmId('')}>
        <DialogTitle>{t('booking.cancelTitle')}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmId('')} disabled={cancel.isPending}>{t('common.cancel')}</Button>
          <Button color="error" disabled={cancel.isPending} onClick={() => void doCancel()}>{cancel.isPending ? t('common.loading') : t('booking.cancelOk')}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!resched} onClose={() => setResched(null)} maxWidth="md" fullWidth>
        <DialogTitle>{t('booking.reschedule')}</DialogTitle>
        <Box sx={{ p: 2 }}>
          {slotsLoading && <Loading />}
          {slotsError && <LoadError message="Failed to load slots" onRetry={() => void refetchSlots()} />}
          {!slotsLoading && !slotsError && <SlotPicker slots={slots ?? []} picked={picked} onPick={setPicked} />}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button onClick={() => setResched(null)}>{t('common.cancel')}</Button>
            <Button variant="contained" disabled={!picked || reschedule.isPending} onClick={() => void doReschedule()}>{reschedule.isPending ? t('common.loading') : t('booking.reschedule')}</Button>
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
}
