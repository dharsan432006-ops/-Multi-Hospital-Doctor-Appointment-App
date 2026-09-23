import React, { useState } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Pagination,
  Button,
  ButtonGroup,
  Paper,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useHospitals } from '../api/hooks.js';
import { HospitalCard } from '../components/HospitalCard.js';
import { Empty, Loading, LoadError } from '../components/States.js';
import { BangaloreHospitalMap } from '../components/BangaloreHospitalMap.js';

export function HospitalList() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [q, setQ] = useState('');
  const [accreditation, setAccreditation] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  // Load hospitals (fetch page 1 with up to 100 for comprehensive map display)
  const { data, isLoading, isError, error, refetch } = useHospitals({
    q: viewMode === 'list' ? q : undefined,
    accreditation: viewMode === 'list' ? accreditation : undefined,
    emergency: viewMode === 'list' && emergency ? 'true' : undefined,
    type: viewMode === 'list' ? type : undefined,
    page: viewMode === 'list' ? page : 1,
    pageSize: viewMode === 'list' ? 10 : 100,
  });

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header & View Switcher */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {t('hospitals.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Find the nearest accredited hospital, trauma center, or quaternary care facility in Bengaluru.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 0.5,
            bgcolor: '#f1f5f9',
            borderRadius: 2.5,
            border: '1px solid #e2e8f0',
          }}
        >
          <ButtonGroup size="medium" sx={{ borderRadius: 2 }}>
            <Button
              variant={viewMode === 'map' ? 'contained' : 'text'}
              onClick={() => setViewMode('map')}
              sx={{
                bgcolor: viewMode === 'map' ? '#4f46e5' : 'transparent',
                color: viewMode === 'map' ? 'white' : '#475569',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                borderRadius: 2,
                '&:hover': { bgcolor: viewMode === 'map' ? '#4338ca' : '#e2e8f0' },
              }}
            >
              🗺️ Map & Nearest Facility
            </Button>
            <Button
              variant={viewMode === 'list' ? 'contained' : 'text'}
              onClick={() => setViewMode('list')}
              sx={{
                bgcolor: viewMode === 'list' ? '#4f46e5' : 'transparent',
                color: viewMode === 'list' ? 'white' : '#475569',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                borderRadius: 2,
                '&:hover': { bgcolor: viewMode === 'list' ? '#4338ca' : '#e2e8f0' },
              }}
            >
              📋 Directory Cards
            </Button>
          </ButtonGroup>
        </Paper>
      </Box>

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <Box>
          {isLoading && <Loading />}
          {isError && <LoadError message="Failed to load hospitals" error={error} onRetry={() => void refetch()} />}
          {data && (
            <BangaloreHospitalMap hospitals={data.data} />
          )}
        </Box>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
            <TextField
              size="small"
              label={t('common.search')}
              placeholder={t('hospitals.searchPh')}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              fullWidth
            />
            <TextField
              select
              size="small"
              label={t('hospitals.accreditation')}
              value={accreditation}
              onChange={(e) => {
                setAccreditation(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">{t('hospitals.all')}</MenuItem>
              <MenuItem value="NABH">NABH</MenuItem>
              <MenuItem value="JCI">JCI</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label={t('hospitals.type')}
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">{t('hospitals.all')}</MenuItem>
              <MenuItem value="PRIVATE">Private</MenuItem>
              <MenuItem value="GOVERNMENT">Government</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={emergency}
                  onChange={(e) => {
                    setEmergency(e.target.checked);
                    setPage(1);
                  }}
                />
              }
              label={t('hospitals.emergencyOnly')}
            />
          </Stack>

          {isLoading && <Loading />}
          {isError && <LoadError message="Failed to load" error={error} onRetry={() => void refetch()} />}
          {data && data.data.length === 0 && <Empty />}

          <Stack spacing={2}>
            {data?.data.map((h) => (
              <HospitalCard key={h.id} hospital={h} />
            ))}
          </Stack>

          {data && data.pagination.totalPages > 1 && (
            <Pagination
              sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}
              count={data.pagination.totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
