import { Card, CardContent, Stack, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Hospital } from '../api/types.js';
import { AccreditationBadges, EmergencyBadge, UnverifiedBadge } from './Badges.js';

export function HospitalCard({ hospital }: { hospital: Hospital }) {
  const { t } = useTranslation();
  const mapHref = hospital.latitude != null && hospital.longitude != null
    ? `https://www.openstreetmap.org/?mlat=${hospital.latitude}&mlon=${hospital.longitude}#map=15/${hospital.latitude}/${hospital.longitude}`
    : null;
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
          <Typography variant="h6" component={RouterLink} to={`/hospitals/${hospital.id}`} style={{ textDecoration: 'none' }}>
            {hospital.name}
          </Typography>
          {!hospital.dataVerified && <UnverifiedBadge />}
          <EmergencyBadge has={hospital.hasEmergency} />
        </Stack>
        <AccreditationBadges items={hospital.accreditation} />
        {hospital.address ? (
          <Typography variant="body2" sx={{ mt: 1 }}>{hospital.address}{mapHref && <> · <a href={mapHref} target="_blank" rel="noreferrer">Map</a></>}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('badges.unverified')}</Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {hospital.keySpecialties.join(', ')}{hospital.beds != null && ` · ${hospital.beds} ${t('hospitals.beds')}`}
        </Typography>
        <Button size="small" component={RouterLink} to={`/hospitals/${hospital.id}`} sx={{ mt: 1 }}>{t('common.view')}</Button>
      </CardContent>
    </Card>
  );
}
