import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h3" gutterBottom>404 — Page not found</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        The page you are looking for does not exist or was moved.
      </Typography>
      <Button variant="contained" component={RouterLink} to="/">
        {t('nav.home')}
      </Button>{' '}
      <Button variant="outlined" component={RouterLink} to="/doctors">
        {t('nav.doctors')}
      </Button>
    </Box>
  );
}
