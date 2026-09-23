import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
} from '@mui/material';

interface HowItWorksModalProps {
  open: boolean;
  onClose: () => void;
  onStartBooking: () => void;
}

export function HowItWorksModal({ open, onClose, onStartBooking }: HowItWorksModalProps) {
  const steps = [
    {
      num: '01',
      title: 'Find Your Specialist & Clinic',
      desc: 'Filter by specialty (Cardiology, Pediatrics, General Medicine, etc.), hospital branch across Bangalore, or describe your symptoms to our instant guide.',
      icon: '🩺',
    },
    {
      num: '02',
      title: 'Choose In-Person or Video Slot',
      desc: 'Select your preferred consultation format. Pick verified real-time IST slots with instant confirmation and no double-booking.',
      icon: '📅',
    },
    {
      num: '03',
      title: 'Automated 24h Reminders & Care',
      desc: 'Receive automated SMS & email reminders exactly 24 hours in advance. Consult in clinic or via video room, receive digital prescriptions, and access records anytime.',
      icon: '🔔',
    },
  ];

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="overline" sx={{ color: '#4f46e5', fontWeight: 800 }}>
              Doctify Walkthrough
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Getting Care Has Never Been Easier
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Our streamlined process makes healthcare accessible in just three simple steps.
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5, mb: 4 }}>
          {steps.map((s) => (
            <Paper
              key={s.num}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                bgcolor: '#f8fafc',
                position: 'relative',
              }}
            >
              <Box sx={{ fontSize: 32, mb: 1.5 }}>{s.icon}</Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                {s.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {s.desc}
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 16,
                  color: '#e2e8f0',
                  fontWeight: 900,
                  fontSize: 48,
                  userSelect: 'none',
                  opacity: 0.8,
                }}
              >
                {s.num}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              onStartBooking();
            }}
            sx={{ bgcolor: '#4f46e5', fontWeight: 700 }}
          >
            Start Booking Now ➔
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
