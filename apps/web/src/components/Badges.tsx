import { Chip, Stack } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { useTranslation } from 'react-i18next';

export function UnverifiedBadge() {
  const { t } = useTranslation();
  return <Chip size="small" color="warning" icon={<WarningAmberIcon />} label={t('badges.unverified')} />;
}

export function DemoBadge() {
  const { t } = useTranslation();
  return <Chip size="small" color="info" label={t('badges.demoData')} />;
}

export function EmergencyBadge({ has }: { has: boolean }) {
  const { t } = useTranslation();
  return has ? (
    <Chip size="small" color="error" icon={<LocalHospitalIcon />} label={t('badges.emergency')} />
  ) : (
    <Chip size="small" variant="outlined" label={t('badges.noEmergency')} />
  );
}

export function AccreditationBadges({ items, verified }: { items: string[]; verified?: boolean }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {items.map((a) => (
        <Chip
          key={a}
          size="small"
          color={verified ? 'success' : 'default'}
          variant={verified ? 'filled' : 'outlined'}
          icon={verified ? <VerifiedIcon /> : undefined}
          label={verified ? a : `${a} (unverified)`}
        />
      ))}
    </Stack>
  );
}
