import { Box, Button, Stack, TextField, Typography, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { ConsentCheckboxes } from '../components/ConsentCheckboxes.js';
import { ApiError } from '../api/client.js';

const Schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Min 8 chars: upper, lower, digit, symbol'),
  phone: z.string().min(7),
});

export function Register() {
  const { t } = useTranslation();
  const { register: signup } = useAuth();
  const nav = useNavigate();
  const [consents, setConsents] = useState<string[]>(['MEDICAL_CARE', 'APPOINTMENT_COMMUNICATIONS']);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof Schema>>({ resolver: zodResolver(Schema) });

  const onSubmit = async (v: z.infer<typeof Schema>) => {
    setError('');
    if (!consents.includes('MEDICAL_CARE')) { setError(t('auth.needConsent')); return; }
    try {
      await signup({ ...v, consents });
      nav('/', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registration failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>{t('auth.registerTitle')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <Stack spacing={2}>
          <TextField label={t('auth.name')} {...register('name')} error={!!errors.name} helperText={errors.name?.message} fullWidth />
          <TextField label={t('auth.email')} type="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} fullWidth />
          <TextField label={t('auth.password')} type="password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} fullWidth />
          <TextField label={t('auth.phone')} {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} fullWidth />
          <ConsentCheckboxes value={consents} onChange={setConsents} />
          <Button type="submit" variant="contained" disabled={isSubmitting}>{t('auth.registerTitle')}</Button>
        </Stack>
      </form>
    </Box>
  );
}
