import { Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const PURPOSES = ['MEDICAL_CARE', 'APPOINTMENT_COMMUNICATIONS', 'INSURANCE', 'RESEARCH'] as const;

export function ConsentCheckboxes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation();
  const toggle = (p: string) => {
    onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  };
  const labels: Record<string, string> = {
    MEDICAL_CARE: t('consents.medical'),
    APPOINTMENT_COMMUNICATIONS: t('consents.comms'),
    INSURANCE: t('consents.insurance'),
    RESEARCH: t('consents.research'),
  };
  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>{t('consents.title')} *</Typography>
      <FormGroup>
        {PURPOSES.map((p) => (
          <FormControlLabel key={p} control={<Checkbox checked={value.includes(p)} onChange={() => toggle(p)} />} label={labels[p]} />
        ))}
      </FormGroup>
    </>
  );
}
