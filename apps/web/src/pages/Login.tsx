import { Box, Button, Stack, TextField, Typography, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { ApiError } from '../api/client.js';

const Schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<z.infer<typeof Schema>>({ resolver: zodResolver(Schema) });

  const onSubmit = async (v: z.infer<typeof Schema>) => {
    setError('');
    try {
      await login(v.email, v.password);
      nav(loc.state?.from ?? '/', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>{t('auth.loginTitle')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <Stack spacing={2}>
          <TextField label={t('auth.email')} type="email" {...register('email')} fullWidth />
          <TextField label={t('auth.password')} type="password" {...register('password')} fullWidth />
          <Button type="submit" variant="contained" disabled={isSubmitting}>{t('nav.login')}</Button>
          <Button component={RouterLink} to="/register">{t('auth.registerTitle')}</Button>
        </Stack>
      </form>
    </Box>
  );
}
