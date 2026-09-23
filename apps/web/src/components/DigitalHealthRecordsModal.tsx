import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Paper,
  Divider,
  Alert,
} from '@mui/material';

interface DigitalHealthRecordsModalProps {
  open: boolean;
  onClose: () => void;
}

export function DigitalHealthRecordsModal({ open, onClose }: DigitalHealthRecordsModalProps) {
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const mockRecords = [
    {
      id: 'REC-9081',
      date: '18 Sept 2026',
      title: 'Comprehensive Cardiovascular Consultation Summary',
      doctor: 'Dr. Priya Kapoor (Cardiology)',
      hospital: 'Apollo Hospital, Bannerghatta Road',
      type: 'Prescription & Clinical Notes',
      tags: ['ECG Normal', 'BP 124/82', 'Rx Telmisartan 40mg'],
    },
    {
      id: 'LAB-4412',
      date: '14 Sept 2026',
      title: 'Lipid Profile & Fasting Blood Sugar Report',
      doctor: 'Dr. Ananya Rao (Pathology)',
      hospital: 'Manipal Hospital, Old Airport Road',
      type: 'Laboratory Diagnostics',
      tags: ['HbA1c 5.6%', 'Total Cholesterol 185 mg/dL', 'Normal'],
    },
    {
      id: 'REC-7731',
      date: '02 Aug 2026',
      title: 'Pediatric Well-Child & Immunization Check',
      doctor: 'Dr. Rajesh Deshmukh (Pediatrics)',
      hospital: 'Fortis Hospital, Cunningham Road',
      type: 'Immunization Log',
      tags: ['MMR Booster Given', 'Growth 75th Percentile'],
    },
  ];

  const handleDownload = (recId: string) => {
    setDownloadMsg(`Record ${recId} downloaded securely as encrypted PDF.`);
    setTimeout(() => setDownloadMsg(null), 3500);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 4, p: 2 },
        },
      }}
    >
      <DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: '#4f46e5',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Secure Digital Health Records
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Access all your past visits, laboratory diagnostic tests, and digital prescriptions in one protected repository.
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        </Box>

        {downloadMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {downloadMsg}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
          {mockRecords.map((r) => (
            <Paper
              key={r.id}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                '&:hover': { borderColor: '#cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label={r.type} size="small" color="primary" sx={{ height: 22, fontSize: 11, fontWeight: 700 }} />
                  <Typography variant="caption" color="text.secondary">
                    {r.date} · ID: {r.id}
                  </Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {r.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.doctor} · {r.hospital}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                  {r.tags.map((t, idx) => (
                    <Chip key={idx} label={t} size="small" variant="outlined" sx={{ fontSize: 11, bgcolor: '#f8fafc' }} />
                  ))}
                </Box>
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={() => handleDownload(r.id)}
                sx={{
                  borderRadius: 9999,
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#cbd5e1',
                  color: '#0f172a',
                }}
              >
                📥 Download PDF
              </Button>
            </Paper>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Encrypted with AES-256 GCM in compliance with Digital Personal Data Protection (DPDP) Act.
          </Typography>
          <Button variant="contained" onClick={onClose} sx={{ bgcolor: '#4f46e5' }}>
            Done
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
