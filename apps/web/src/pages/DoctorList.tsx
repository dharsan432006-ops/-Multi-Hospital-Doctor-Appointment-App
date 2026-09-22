import { useState } from 'react';
import { Box, Pagination, Stack, TextField, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDoctors } from '../api/hooks.js';
import { DoctorCard } from '../components/DoctorCard.js';
import { Empty, Loading, LoadError } from '../components/States.js';

export function DoctorList() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const [specialty, setSpecialty] = useState(sp.get('specialty') ?? '');
  const [hospital, setHospital] = useState(sp.get('hospital') ?? '');
  const [department, setDepartment] = useState('');
  const [language, setLanguage] = useState(sp.get('language') ?? '');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useDoctors({ specialty, hospital, department, language, q, page, pageSize: 10 });

  const bind = (setter: (v: string) => void, key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value); setPage(1);
    const next = new URLSearchParams(sp);
    if (e.target.value) next.set(key, e.target.value); else next.delete(key);
    setSp(next, { replace: true });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('doctors.title')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField label={t('doctors.specialty')} value={specialty} onChange={bind(setSpecialty, 'specialty')} fullWidth />
        <TextField label={t('doctors.hospital')} value={hospital} onChange={bind(setHospital, 'hospital')} fullWidth />
        <TextField label={t('doctors.department')} value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} fullWidth />
        <TextField label={t('doctors.language')} value={language} onChange={bind(setLanguage, 'language')} fullWidth />
        <TextField label={t('doctors.keywords')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} fullWidth />
      </Stack>
      {isLoading && <Loading />}
      {isError && <LoadError message="Failed to load" error={error} onRetry={() => void refetch()} />}
      {data && data.data.length === 0 && <Empty />}
      <Stack spacing={2}>
        {data?.data.map((d) => <DoctorCard key={d.id} doctor={d} />)}
      </Stack>
      {data && data.pagination.totalPages > 1 && (
        <Pagination sx={{ mt: 2 }} count={data.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} />
      )}
    </Box>
  );
}
