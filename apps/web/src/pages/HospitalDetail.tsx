import { Box, Typography, Stack, Chip, Button } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHospital } from '../api/hooks.js';
import { AccreditationBadges, EmergencyBadge, UnverifiedBadge } from '../components/Badges.js';
import { Loading, LoadError, Empty } from '../components/States.js';

export function HospitalDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { data, isLoading, isError, refetch } = useHospital(id);

  if (isLoading) return <Loading />;
  if (isError || !data) return <LoadError message="Failed to load" onRetry={() => void refetch()} />;
  const h = data;
  const mapHref = h.latitude != null && h.longitude != null
    ? `https://www.openstreetmap.org/?mlat=${h.latitude}&mlon=${h.longitude}#map=15/${h.latitude}/${h.longitude}`
    : null;

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        <Typography variant="h4">{h.name}</Typography>
        {!h.dataVerified && <UnverifiedBadge />}
        <EmergencyBadge has={h.hasEmergency} />
      </Stack>
      <Box sx={{ my: 1 }}><AccreditationBadges items={h.accreditation} verified={h.dataVerified} /></Box>
      {h.address ? <Typography>{h.address}{mapHref && <> · <a href={mapHref} target="_blank" rel="noreferrer">Map</a></>}</Typography> : <Empty text={t('badges.unverified')} />}
      {h.contact && <Typography>{t('hospitals.contact')}: {h.contact}</Typography>}
      {h.website && <Typography>{t('hospitals.website')}: <a href={h.website} target="_blank" rel="noreferrer">{h.website}</a></Typography>}
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {h.keySpecialties.join(', ')}{h.beds != null && ` · ${h.beds} ${t('hospitals.beds')}`}{h.bedsNote && ` (${h.bedsNote})`}
      </Typography>
      <Typography variant="h6" sx={{ mt: 2 }}>{t('hospitals.departments')}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        {(h.departments ?? []).map((d) => <Chip key={d.id} label={d.name} />)}
      </Stack>
      <Button variant="contained" component={RouterLink} to={`/doctors?hospital=${encodeURIComponent(h.name)}`} sx={{ mt: 2 }}>
        {t('doctors.title')}
      </Button>
    </Box>
  );
}
