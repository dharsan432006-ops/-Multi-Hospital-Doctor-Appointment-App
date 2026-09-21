import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function Loading() {
  const { t } = useTranslation();
  return <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 4 }}><CircularProgress size={20} /><Typography>{t('common.loading')}</Typography></Box>;
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return <Alert severity="error" action={<button onClick={onRetry}>{t('common.retry')}</button>}>{message}</Alert>;
}

export function Empty({ text }: { text?: string }) {
  const { t } = useTranslation();
  return <Typography color="text.secondary" sx={{ py: 3 }}>{text ?? t('common.noResults')}</Typography>;
}
