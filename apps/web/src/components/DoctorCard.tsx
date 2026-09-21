import { useState } from 'react';
import { Avatar, Card, CardContent, CardMedia, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { Doctor } from '../api/types.js';
import { DemoBadge } from './Badges.js';

function initials(name: string): string {
  return name.replace(/^Dr\.\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function DoctorAvatar({ doctor, size = 56 }: { doctor: Doctor; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (doctor.photoUrl && !failed) {
    return <CardMedia component="img" image={doctor.photoUrl} alt={doctor.name} onError={() => setFailed(true)} sx={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return <Avatar sx={{ width: size, height: size }}>{initials(doctor.name)}</Avatar>;
}

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Card sx={{ display: 'flex', gap: 2, p: 2 }} component={RouterLink} to={`/doctors/${doctor.id}`} style={{ textDecoration: 'none' }}>
      <DoctorAvatar doctor={doctor} />
      <CardContent sx={{ p: 0, flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h6">{doctor.name}</Typography>
          {doctor.isDemo && <DemoBadge />}
        </Stack>
        <Typography color="text.secondary">{doctor.specialty} · {doctor.qualifications}</Typography>
        <Typography variant="body2" color="text.secondary">{doctor.languages.join(', ')}</Typography>
        <Typography variant="body2">{doctor.affiliations?.map((a) => a.hospital.name).join(' · ')}</Typography>
      </CardContent>
    </Card>
  );
}
