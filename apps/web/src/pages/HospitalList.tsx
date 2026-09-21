import { useState } from 'react';
import { Box, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography, Pagination } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useHospitals } from '../api/hooks.js';
import { HospitalCard } from '../components/HospitalCard.js';
import { Empty, Loading, LoadError } from '../components/States.js';

export function HospitalList() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [accreditation, setAccreditation] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useHospitals({ q, accreditation, emergency: emergency ? 'true' : undefined, type, page, pageSize: 10 });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('hospitals.title')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField label={t('common.search')} placeholder={t('hospitals.searchPh')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} fullWidth />
        <TextField select label={t('hospitals.accreditation')} value={accreditation} onChange={(e) => { setAccreditation(e.target.value); setPage(1); }} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t('hospitals.all')}</MenuItem>
          <MenuItem value="NABH">NABH</MenuItem>
          <MenuItem value="JCI">JCI</MenuItem>
        </TextField>
        <TextField select label={t('hospitals.type')} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t('hospitals.all')}</MenuItem>
          <MenuItem value="PRIVATE">Private</MenuItem>
          <MenuItem value="GOVERNMENT">Government</MenuItem>
        </TextField>
        <FormControlLabel control={<Checkbox checked={emergency} onChange={(e) => { setEmergency(e.target.checked); setPage(1); }} />} label={t('hospitals.emergencyOnly')} />
      </Stack>
      {isLoading && <Loading />}
      {isError && <LoadError message="Failed to load" onRetry={() => void refetch()} />}
      {data && data.data.length === 0 && <Empty />}
      <Stack spacing={2}>
        {data?.data.map((h) => <HospitalCard key={h.id} hospital={h} />)}
      </Stack>
      {data && data.pagination.totalPages > 1 && (
        <Pagination sx={{ mt: 2 }} count={data.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} />
      )}
    </Box>
  );
}
