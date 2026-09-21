import { useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAvailability, useDoctor } from '../api/hooks.js';
import { DoctorAvatar } from '../components/DoctorCard.js';
import { DemoBadge } from '../components/Badges.js';
import { SlotPicker } from '../components/SlotPicker.js';
import { Empty, Loading, LoadError } from '../components/States.js';
import type { Slot } from '../api/types.js';
import { useAuth } from '../auth/AuthContext.js';

export function DoctorProfile() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: doctor, isLoading, isError, refetch } = useDoctor(id);
  const [hospitalId, setHospitalId] = useState('');
  const { data: slots } = useAvailability(id, hospitalId || undefined);
  const [picked, setPicked] = useState<Slot | null>(null);

  if (isLoading) return <Loading />;
  if (isError || !doctor) return <LoadError message="Failed to load" onRetry={() => void refetch()} />;

  const affs = doctor.affiliations ?? [];
  const effHospitalId = hospitalId || affs[0]?.hospitalId;
  const visibleSlots = (slots ?? []).filter((s) => !hospitalId || s.hospitalId === hospitalId);

  const proceed = () => {
    if (!picked) return;
    if (!user) { nav('/login', { state: { from: `/doctors/${id}` } }); return; }
    sessionStorage.setItem('pendingBooking', JSON.stringify({ doctorId: doctor.id, hospitalId: picked.hospitalId, affiliationId: picked.affiliationId, startsAt: picked.startsAt, endsAt: picked.endsAt }));
    nav('/book/confirm');
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <DoctorAvatar doctor={doctor} size={72} />
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h4">{doctor.name}</Typography>
            {doctor.isDemo && <DemoBadge />}
          </Stack>
          <Typography color="text.secondary">{doctor.specialty} · {doctor.qualifications}</Typography>
          <Typography variant="body2" color="text.secondary">{t('doctors.languages')}: {doctor.languages.join(', ')}</Typography>
        </Box>
      </Stack>
      <Typography variant="h6" sx={{ mt: 3 }}>{t('doctors.hospitalsAff')}</Typography>
      {affs.length === 0 && <Empty />}
      {affs.map((a) => (
        <Typography key={a.id} variant="body2">
          {a.hospital.name} · {a.department?.name ?? ''}{a.schedulePending ? ' (schedule pending)' : ''}
        </Typography>
      ))}
      <Typography variant="h6" sx={{ mt: 3 }}>{t('doctors.availability')}</Typography>
      {affs.length > 1 && (
        <TextField select label={t('doctors.hospital')} value={hospitalId} onChange={(e) => { setHospitalId(e.target.value); setPicked(null); }} sx={{ minWidth: 260, my: 1 }}>
          <MenuItem value="">All</MenuItem>
          {affs.map((a) => <MenuItem key={a.hospitalId} value={a.hospitalId}>{a.hospital.name}</MenuItem>)}
        </TextField>
      )}
      <SlotPicker slots={visibleSlots} picked={picked} onPick={setPicked} />
      <Button variant="contained" sx={{ mt: 2 }} disabled={!picked} onClick={proceed}>
        {t('common.book')}{picked ? ` · ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(picked.startsAt))} IST` : ''}
      </Button>
      {!effHospitalId && <Empty text={t('doctors.noSlots')} />}
    </Box>
  );
}
