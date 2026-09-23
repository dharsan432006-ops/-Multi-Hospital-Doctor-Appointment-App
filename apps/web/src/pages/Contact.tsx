import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Chip,
} from '@mui/material';

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Chip label="24/7 Patient Support" color="primary" size="small" sx={{ fontWeight: 700, mb: 1 }} />
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
          Contact Doctify
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
          Have questions about doctor appointments, telehealth video consultations, or hospital affiliations in Bangalore?
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 4 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Send Us a Message
          </Typography>

          {submitted ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Thank you for contacting Doctify! Our support team will reply to <strong>{email}</strong> shortly.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Your Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="How can we help you?"
                  multiline
                  minRows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  fullWidth
                  placeholder="e.g. Inquiring about pediatrician slots or prescription history..."
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ bgcolor: '#4f46e5', py: 1.3, borderRadius: 9999, fontWeight: 700 }}
                >
                  Submit Inquiry ➔
                </Button>
              </Stack>
            </form>
          )}
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
              🚨 Emergency Assistance
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              For immediate critical medical emergencies or trauma care:
            </Typography>
            <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 800 }}>
              Dial 112
            </Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
              🏥 Bangalore Headquarters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Doctify Healthcare Network<br />
              Koramangala 5th Block, 80 Feet Road<br />
              Bangalore, Karnataka 560034<br />
              support@doctify.health
            </Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
              ⏰ Operational Hours
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Telehealth & Video Consults: 24/7 Available<br />
              • OPD Clinic Timings: 08:00 AM - 08:00 PM IST<br />
              • Automated Reminders: Dispatched 24h prior
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}
