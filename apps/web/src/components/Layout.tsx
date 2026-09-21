import { AppBar, Toolbar, Typography, Button, Box, Container, Select, MenuItem, FormControl } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext.js';
import { LANGUAGES } from '../i18n/index.js';

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1 }}>
            {t('appName')}
          </Typography>
          <Button color="inherit" component={RouterLink} to="/hospitals">{t('nav.hospitals')}</Button>
          <Button color="inherit" component={RouterLink} to="/doctors">{t('nav.doctors')}</Button>
          {user?.role === 'PATIENT' && <Button color="inherit" component={RouterLink} to="/bookings">{t('nav.bookings')}</Button>}
          {user?.role === 'DOCTOR' && <Button color="inherit" component={RouterLink} to="/doctor">{t('nav.doctorPortal')}</Button>}
          {user?.role === 'ADMIN' && <Button color="inherit" component={RouterLink} to="/admin">{t('nav.admin')}</Button>}
          {user ? (
            <>
              <Button color="inherit" component={RouterLink} to="/profile">{user.email}</Button>
              <Button color="inherit" onClick={async () => { await logout(); nav('/'); }}>{t('nav.logout')}</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">{t('nav.login')}</Button>
              <Button color="inherit" component={RouterLink} to="/register">{t('nav.register')}</Button>
            </>
          )}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={i18n.language} onChange={(e) => void i18n.changeLanguage(e.target.value)} sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.4)' } }}>
              {LANGUAGES.map((l) => <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3, flexGrow: 1 }}>{children}</Container>
      <Box component="footer" sx={{ py: 2, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>
        Demo data for evaluation · Asia/Kolkata (IST)
      </Box>
    </Box>
  );
}
