import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { useConsents, useSetConsent } from '../api/hooks.js';
import { Loading, LoadError } from '../components/States.js';

const ALL = ['MEDICAL_CARE', 'APPOINTMENT_COMMUNICATIONS', 'INSURANCE', 'RESEARCH'] as const;
const LABELS: Record<string, string> = { MEDICAL_CARE: 'consents.medical', APPOINTMENT_COMMUNICATIONS: 'consents.comms', INSURANCE: 'consents.insurance', RESEARCH: 'consents.research' };

export function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useConsents();
  const setConsent = useSetConsent();
  const [msg, setMsg] = useState('');

  if (isLoading) return <Loading />;
  if (isError) return <LoadError message="Failed to load consents" onRetry={() => void refetch()} />;
  const active = new Set((data ?? []).filter((c) => !c.withdrawnAt).map((c) => c.purpose));

  const toggle = async (purpose: (typeof ALL)[number]) => {
    try {
      await setConsent.mutateAsync({ purpose, withdraw: active.has(purpose) });
      setMsg('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h4" gutterBottom>{t('nav.profile')}</Typography>
      <Typography color="text.secondary">{user?.email} · {user?.role}</Typography>
      <Typography variant="h6" sx={{ mt: 2 }}>{t('consents.title')}</Typography>
      {msg && <Alert severity="error">{msg}</Alert>}
      <Stack spacing={1} sx={{ mt: 1 }}>
        {ALL.map((p) => (
          <Stack key={p} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography sx={{ flexGrow: 1 }}>{t(LABELS[p])}</Typography>
            <Button size="small" variant={active.has(p) ? 'outlined' : 'contained'} disabled={setConsent.isPending} onClick={() => void toggle(p)}>
              {active.has(p) ? t('consents.withdraw') : t('consents.grant')}
            </Button>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
