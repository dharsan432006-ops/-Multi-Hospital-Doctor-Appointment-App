import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function Loading() {
  const { t } = useTranslation();
  return <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 4 }}><CircularProgress size={20} /><Typography>{t('common.loading')}</Typography></Box>;
}

export function LoadError({ message, onRetry, error }: { message: string; onRetry: () => void; error?: unknown }) {
  const { t } = useTranslation();
  // Internal diagnostics only: preserve status + content-type + URL + code
  // in devtools while keeping the user-facing message clean. Never render
  // secrets, stack traces, response bodies, or tokens in the UI.
  if (error) {
    try {
      const e = error as { status?: number; code?: string; message?: string; url?: string; requestId?: string; contentType?: string };
      // eslint-disable-next-line no-console
      console.error(
        `[ui] load failed: status=${e?.status ?? '?'} contentType=${e?.contentType ?? '?'} code=${e?.code ?? '?'} url=${e?.url ?? '?'}${e?.requestId ? ` requestId=${e.requestId}` : ''} message=${e?.message ?? error}`
      );
    } catch {
      // logging must never break rendering
    }
  }
  return <Alert severity="error" action={<button onClick={onRetry}>{t('common.retry')}</button>}>{message}</Alert>;
}

export function Empty({ text }: { text?: string }) {
  const { t } = useTranslation();
  return <Typography color="text.secondary" sx={{ py: 3 }}>{text ?? t('common.noResults')}</Typography>;
}
