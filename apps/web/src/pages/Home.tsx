import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography, Alert, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/client.js';

export function Home() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [specialty, setSpecialty] = useState('');
  const [hospital, setHospital] = useState('');
  const [language, setLanguage] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [aiResult, setAiResult] = useState<{ specialties: string[]; urgency: string; nextStep: string } | null>(null);
  const [aiError, setAiError] = useState('');
  const [aiPending, setAiPending] = useState(false);

  const search = () => {
    const qs = new URLSearchParams();
    if (specialty) qs.set('specialty', specialty);
    if (hospital) qs.set('hospital', hospital);
    if (language) qs.set('language', language);
    nav(`/doctors?${qs}`);
  };

  const askAi = async () => {
    if (aiPending || symptoms.length < 3) return;
    setAiPending(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await apiFetch<{ specialties: string[]; urgency: string; nextStep: string; disclaimer: string }>('/ai/symptom-guide', {
        method: 'POST',
        body: JSON.stringify({ symptoms: symptoms.slice(0, 1000) }),
      });
      setAiResult(res);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI unavailable');
    } finally {
      setAiPending(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('appName')}</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField label={t('doctors.specialty')} value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Cardiology" fullWidth />
          <TextField label={t('doctors.hospital')} value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Apollo" fullWidth />
          <TextField label={t('doctors.language')} value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Kannada" fullWidth />
          <Button variant="contained" onClick={search}>{t('common.search')}</Button>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>{t('ai.title')}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField label={t('ai.symptomsPh')} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} fullWidth multiline minRows={2} />
          <Button variant="outlined" onClick={() => void askAi()} disabled={symptoms.length < 3 || aiPending}>{aiPending ? t('common.loading') : t('ai.ask')}</Button>
        </Stack>
        {aiError && <Alert severity="warning" sx={{ mt: 1 }}>{aiError} ({t('ai.disclaimer')})</Alert>}
        {aiResult && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {aiResult.specialties.join(', ') || '—'} · {aiResult.urgency} · {aiResult.nextStep} ({t('ai.disclaimer')})
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
