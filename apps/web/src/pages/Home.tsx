import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/client.js';
import { TelehealthConsultModal } from '../components/TelehealthConsultModal.js';
import { HowItWorksModal } from '../components/HowItWorksModal.js';
import { DigitalHealthRecordsModal } from '../components/DigitalHealthRecordsModal.js';

export function Home() {
  const { t } = useTranslation();
  const nav = useNavigate();

  // Search & AI states
  const [specialty, setSpecialty] = useState('');
  const [hospital, setHospital] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [aiResult, setAiResult] = useState<{ specialties: string[]; urgency: string; nextStep: string } | null>(null);
  const [aiError, setAiError] = useState('');
  const [aiPending, setAiPending] = useState(false);

  // Modals
  const [telehealthOpen, setTelehealthOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const search = (specParam?: string) => {
    const qs = new URLSearchParams();
    const targetSpec = specParam || specialty;
    if (targetSpec) qs.set('specialty', targetSpec);
    if (hospital) qs.set('hospital', hospital);
    nav(`/doctors?${qs}`);
  };

  const askAi = async () => {
    if (aiPending || symptoms.length < 3) return;
    setAiPending(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await apiFetch<{ specialties: string[]; urgency: string; nextStep: string; disclaimer: string }>(
        '/ai/symptom-guide',
        {
          method: 'POST',
          body: JSON.stringify({ symptoms: symptoms.slice(0, 1000) }),
        }
      );
      setAiResult(res);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI symptom guide unavailable');
    } finally {
      setAiPending(false);
    }
  };

  const services = [
    {
      id: 'general',
      title: 'General Consultations',
      desc: 'Diagnosis, prescriptions, and expert advice in minutes.',
      specialtyQuery: 'General Medicine',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </svg>
      ),
      highlighted: false,
    },
    {
      id: 'pediatrics',
      title: 'Pediatrics',
      desc: "Specialized care for your child's growth and health.",
      specialtyQuery: 'Pediatrics',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="9" cy="10" r="1.5" />
          <circle cx="15" cy="10" r="1.5" />
          <path d="M8 15s1.5 2 4 2 4-2 4-2" />
        </svg>
      ),
      highlighted: true, // featured card from image
    },
    {
      id: 'dental',
      title: 'Dental Services',
      desc: 'Cleanings, fillings, and smile makeovers.',
      specialtyQuery: 'Dental Surgery',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 1.5 8 3 13 1 3 3 3 3 0 0-2 .5-5 0-7-.5-2-1.5-2-1.5-2s1.5 0 2-2c.5-2-.5-5-2-5" />
          <path d="M12 2c3.5 0 6 2.5 6 6 0 3.5-1.5 8-3 13-1 3-3 3-3 0 0-2-.5-5 0-7 .5-2 1.5-2 1.5-2s-1.5 0-2-2c-.5-2 .5-5 2-5" />
        </svg>
      ),
      highlighted: false,
    },
    {
      id: 'mental',
      title: 'Mental Health',
      desc: 'Private therapy and psychiatric help from licensed professionals.',
      specialtyQuery: 'Psychiatry',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z" />
          <path d="M9 21h6" />
        </svg>
      ),
      highlighted: false,
    },
    {
      id: 'diagnostics',
      title: 'Diagnostics & Lab Tests',
      desc: 'Fast, accurate reports delivered directly to your phone.',
      specialtyQuery: 'Diagnostics',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2v14a6 6 0 0 0 12 0V2" />
          <line x1="6" x2="18" y1="6" y2="6" />
          <line x1="6" x2="18" y1="10" y2="10" />
        </svg>
      ),
      highlighted: false,
    },
    {
      id: 'chronic',
      title: 'Chronic Care Programs',
      desc: 'Tailored plans for diabetes, heart conditions, and more.',
      specialtyQuery: 'Cardiology',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      ),
      highlighted: false,
    },
  ];

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* SECTION 1: HERO CONTAINER (MATCHING IMAGE) */}
      <Container maxWidth="xl" sx={{ pt: 3, pb: 6 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          {/* Left Hero Card (Gradient Canvas) */}
          <Box
            sx={{
              borderRadius: '28px',
              p: { xs: 3.5, sm: 5, md: 6 },
              background: 'linear-gradient(135deg, #ede9fe 0%, #fdf4ff 35%, #fffbeb 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 540,
              position: 'relative',
              boxShadow: '0 4px 20px -2px rgba(79, 70, 229, 0.08)',
              overflow: 'hidden',
            }}
          >
            <Box>
              {/* Badge */}
              <Chip
                label="24/7 Services Available"
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  color: '#4f46e5',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  mb: 3,
                  py: 1.8,
                  px: 1,
                  borderRadius: 9999,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              />

              {/* Main Headline */}
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.4rem' },
                  lineHeight: 1.12,
                  color: '#0f172a',
                  letterSpacing: '-0.03em',
                  mb: 2.5,
                }}
              >
                Your Health, Our Technology. Trusted Doctors at Your Fingertips.
              </Typography>

              {/* Subtitle */}
              <Typography
                variant="body1"
                sx={{
                  color: '#475569',
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  lineHeight: 1.65,
                  maxWidth: 560,
                  mb: 4,
                }}
              >
                Whether in person or online, Doctify connects you with certified, compassionate healthcare professionals — quickly, safely, and effortlessly.
              </Typography>

              {/* CTA Buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                <Button
                  variant="contained"
                  onClick={() => search()}
                  sx={{
                    bgcolor: '#4f46e5',
                    color: '#ffffff',
                    borderRadius: 9999,
                    px: 3.5,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    boxShadow: '0 8px 20px -4px rgba(79, 70, 229, 0.4)',
                    gap: 1.2,
                    '&:hover': { bgcolor: '#4338ca' },
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  Book Appointment
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => setHowItWorksOpen(true)}
                  sx={{
                    bgcolor: '#ffffff',
                    color: '#0f172a',
                    borderColor: '#e2e8f0',
                    borderRadius: 9999,
                    px: 3.2,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    gap: 1,
                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
                  }}
                >
                  See How It Works ➔
                </Button>
              </Box>

              {/* Quick Action Badges */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
                <Chip
                  onClick={() => nav('/hospitals')}
                  icon={<span style={{ fontSize: '1rem', marginLeft: 6 }}>📍</span>}
                  label="Bangalore Hospital Map & Nearest Facility"
                  clickable
                  sx={{
                    bgcolor: 'rgba(79, 70, 229, 0.08)',
                    color: '#4f46e5',
                    fontWeight: 700,
                    borderRadius: 9999,
                    py: 2,
                    px: 1,
                    '&:hover': { bgcolor: 'rgba(79, 70, 229, 0.16)' },
                  }}
                />
                <Chip
                  onClick={() => nav('/medical-records')}
                  icon={<span style={{ fontSize: '1rem', marginLeft: 6 }}>📋</span>}
                  label="Medical Records & Health History"
                  clickable
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.08)',
                    color: '#059669',
                    fontWeight: 700,
                    borderRadius: 9999,
                    py: 2,
                    px: 1,
                    '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.16)' },
                  }}
                />
              </Box>
            </Box>

            {/* Floating Mini Widgets at Bottom of Left Hero */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                pt: 2,
              }}
            >
              {/* Doctor count widget */}
              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.2,
                  px: 2,
                  borderRadius: 9999,
                  bgcolor: 'rgba(255, 255, 255, 0.92)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                }}
              >
                <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}>
                  <Avatar alt="Doctor" src="/assets/hero_doctors_team.jpg" />
                  <Avatar alt="Doctor" src="/assets/doctors_group_team.jpg" />
                  <Avatar sx={{ bgcolor: '#4f46e5' }}>+</Avatar>
                </AvatarGroup>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                  More than 1k+ Doctors in your Doctify
                </Typography>
              </Paper>

              {/* Calling......... Widget */}
              <Paper
                elevation={0}
                onClick={() => setTelehealthOpen(true)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.2,
                  px: 2,
                  borderRadius: 9999,
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'scale(1.03)', borderColor: '#4f46e5' },
                }}
              >
                <Avatar
                  src="/assets/hero_doctors_team.jpg"
                  sx={{ width: 30, height: 30, border: '2px solid #34d399' }}
                />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                  Calling.........
                </Typography>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    bgcolor: '#ede9fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5',
                  }}
                >
                  ↗
                </Box>
              </Paper>
            </Box>
          </Box>

          {/* Right Hero Card (Doctor Photo Canvas + Floating Video Controls) */}
          <Box
            sx={{
              borderRadius: '28px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 8px 30px -4px rgba(0,0,0,0.12)',
              bgcolor: '#f1f5f9',
              minHeight: 540,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            {/* Real Doctor Image */}
            <Box
              component="img"
              src="/assets/hero_doctors_team.jpg"
              alt="Certified Doctify Medical Doctors"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />

            {/* Gradient Overlay at Bottom of Photo */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 160,
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.7) 0%, transparent 100%)',
                zIndex: 2,
              }}
            />

            {/* Floating Video Call Controller (Camera / Hangup / Mic) */}
            <Box
              sx={{
                position: 'relative',
                zIndex: 3,
                p: 3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Paper
                elevation={6}
                sx={{
                  p: 1.2,
                  px: 2.5,
                  borderRadius: 9999,
                  bgcolor: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {/* Video icon */}
                <IconButton
                  onClick={() => setTelehealthOpen(true)}
                  sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', width: 38, height: 38 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m22 7-6 5 6 5V7Z" />
                    <rect width="14" height="12" x="2" y="6" rx="2" />
                  </svg>
                </IconButton>

                {/* Red Call button */}
                <IconButton
                  onClick={() => setTelehealthOpen(true)}
                  sx={{
                    color: 'white',
                    bgcolor: '#ef4444',
                    width: 44,
                    height: 44,
                    '&:hover': { bgcolor: '#dc2626' },
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.28 8.84 7.42 7 12 7s8.72 1.84 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29s-.52-.11-.7-.28c-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                  </svg>
                </IconButton>

                {/* Mic icon */}
                <IconButton
                  onClick={() => setTelehealthOpen(true)}
                  sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', width: 38, height: 38 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </IconButton>
              </Paper>
            </Box>
          </Box>
        </Box>

        {/* TOP RIGHT FEATURE BANNER (DOCTIFY SIDE CARD FROM IMAGE) */}
        <Box
          id="about"
          sx={{
            mt: 4,
            p: { xs: 3.5, md: 5 },
            borderRadius: '28px',
            bgcolor: '#4338ca', // Deep Doctify Indigo from image
            color: 'white',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1.3fr' },
            gap: 4,
            alignItems: 'center',
            boxShadow: '0 12px 36px -6px rgba(67, 56, 202, 0.35)',
          }}
        >
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'white', mb: 1.5 }}>
              Doctify
            </Typography>
            <Typography variant="body1" sx={{ color: '#e0e7ff', fontSize: '1.05rem', lineHeight: 1.6, mb: 3 }}>
              We're committed to providing you with the highest quality healthcare experience across verified hospital networks in Bangalore.
            </Typography>

            <Box
              component="img"
              src="/assets/doctors_group_team.jpg"
              alt="Doctors Team"
              sx={{
                width: '100%',
                maxHeight: 240,
                objectFit: 'cover',
                borderRadius: 4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Feature 1 */}
            <Paper
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                🛡️
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white' }}>
                  Certified Medical Experts
                </Typography>
                <Typography variant="body2" sx={{ color: '#c7d2fe', fontSize: '0.88rem' }}>
                  Only licensed and verified healthcare professionals with NMC registration.
                </Typography>
              </Box>
            </Paper>

            {/* Feature 2 */}
            <Paper
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                🕒
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white' }}>
                  Same-Day Appointments
                </Typography>
                <Typography variant="body2" sx={{ color: '#c7d2fe', fontSize: '0.88rem' }}>
                  No long waits. Book and consult instantly with live IST slot updates.
                </Typography>
              </Box>
            </Paper>

            {/* Feature 3: Digital Health Records */}
            <Paper
              elevation={0}
              onClick={() => setRecordsOpen(true)}
              sx={{
                p: 2.2,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                transition: 'bgcolor 0.2s',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)' },
              }}
            >
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                📋
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white' }}>
                  Secure Digital Health Records
                </Typography>
                <Typography variant="body2" sx={{ color: '#c7d2fe', fontSize: '0.88rem' }}>
                  Access all your past visits, diagnostic tests, and prescriptions in one click.
                </Typography>
              </Box>
              <Typography sx={{ color: '#e0e7ff', fontWeight: 700, fontSize: 13 }}>View ➔</Typography>
            </Paper>

            {/* Feature 4 */}
            <Paper
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                🌐
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white' }}>
                  In-Person & Online
                </Typography>
                <Typography variant="body2" sx={{ color: '#c7d2fe', fontSize: '0.88rem' }}>
                  Choose what works for you — physical clinics across Bangalore or remote HD video.
                </Typography>
              </Box>
            </Paper>

            <Button
              variant="contained"
              onClick={() => nav('/doctors')}
              sx={{
                mt: 1,
                bgcolor: '#ffffff',
                color: '#4338ca',
                fontWeight: 700,
                fontSize: '0.95rem',
                py: 1.3,
                borderRadius: 9999,
                '&:hover': { bgcolor: '#f8fafc' },
                alignSelf: 'flex-start',
              }}
            >
              Meet Our Doctors ➔
            </Button>
          </Box>
        </Box>
      </Container>

      {/* SECTION 2: FAST DOCTOR SEARCH & AI SYMPTOM GUIDE */}
      <Container maxWidth="xl" sx={{ pb: 6 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            borderRadius: '24px',
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
            Find Bangalore Specialists & Live Slots
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Filter verified doctors by specialty, hospital branch, or spoken language (Kannada, English, Hindi).
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Medical Specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Cardiology, Pediatrics"
              fullWidth
              size="medium"
            />
            <TextField
              label="Hospital Branch"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="e.g. Apollo, Manipal, Fortis"
              fullWidth
              size="medium"
            />
            <Button
              variant="contained"
              onClick={() => search()}
              sx={{
                bgcolor: '#4f46e5',
                color: 'white',
                minWidth: 140,
                fontWeight: 700,
                '&:hover': { bgcolor: '#4338ca' },
              }}
            >
              Search
            </Button>
          </Stack>

          {/* AI Symptom Guide Assistant */}
          <Box sx={{ mt: 3, pt: 3, borderTop: '1px dashed #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip label="AI Guide" size="small" color="primary" sx={{ fontWeight: 700, fontSize: 11 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('ai.title')}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label={t('ai.symptomsPh')}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g. Sharp chest pain while climbing stairs with shortness of breath"
              />
              <Button
                variant="outlined"
                onClick={() => void askAi()}
                disabled={symptoms.length < 3 || aiPending}
                sx={{ borderRadius: 9999, whiteSpace: 'nowrap' }}
              >
                {aiPending ? t('common.loading') : 'Analyze Symptoms'}
              </Button>
            </Stack>

            {aiError && (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                {aiError} ({t('ai.disclaimer')})
              </Alert>
            )}

            {aiResult && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                <strong>Recommended Specialties:</strong> {aiResult.specialties.join(', ') || 'General Physician'} ·{' '}
                <strong>Urgency:</strong> {aiResult.urgency} · <strong>Next Step:</strong> {aiResult.nextStep} (
                {t('ai.disclaimer')})
              </Alert>
            )}
          </Box>
        </Paper>
      </Container>

      {/* SECTION 3: "MEDICAL SUPPORT FOR EVERY NEED" (SERVICES GRID FROM IMAGE) */}
      <Box id="services" sx={{ bgcolor: '#ffffff', py: 8, borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: 6 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '2.6rem' },
                color: '#0f172a',
                letterSpacing: '-0.02em',
                mb: 1.5,
              }}
            >
              Medical Support for Every Need
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6 }}>
              Comprehensive healthcare services designed to meet all your medical needs with convenience and expertise.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {services.map((item) => {
              const isPediatrics = item.highlighted;

              return (
                <Card
                  key={item.id}
                  elevation={0}
                  onClick={() => {
                    setSelectedService(item.title);
                    search(item.specialtyQuery);
                  }}
                  sx={{
                    p: 3.5,
                    borderRadius: '24px',
                    bgcolor: isPediatrics ? '#4f46e5' : '#ffffff',
                    color: isPediatrics ? '#ffffff' : '#0f172a',
                    border: isPediatrics ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: isPediatrics
                      ? '0 12px 30px -4px rgba(79, 70, 229, 0.4)'
                      : '0 2px 10px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 230,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: isPediatrics
                        ? '0 16px 36px -4px rgba(79, 70, 229, 0.5)'
                        : '0 12px 24px -4px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: 3,
                        bgcolor: isPediatrics ? 'rgba(255, 255, 255, 0.2)' : '#ede9fe',
                        color: isPediatrics ? '#ffffff' : '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2.5,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: isPediatrics ? '#ffffff' : '#0f172a',
                        mb: 1,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isPediatrics ? '#e0e7ff' : '#64748b',
                        lineHeight: 1.6,
                        fontSize: '0.92rem',
                      }}
                    >
                      {item.desc}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: isPediatrics ? '#ffffff' : '#4f46e5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      Learn More {isPediatrics ? '➔' : ''}
                    </Typography>
                  </Box>
                </Card>
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* SECTION 4: "GETTING CARE HAS NEVER BEEN EASIER" (3 SIMPLE STEPS) */}
      <Container maxWidth="xl" sx={{ py: 10 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mb: 7 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '2.5rem' },
              color: '#0f172a',
              letterSpacing: '-0.02em',
              mb: 1.5,
            }}
          >
            Getting Care Has Never Been Easier
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Our streamlined process makes healthcare accessible in just three simple steps.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 4,
          }}
        >
          {/* Step 1 */}
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#ede9fe',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              Find Specialist & Facility
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
              Search certified doctors across Apollo, Manipal, and Fortis Bangalore or describe symptoms.
            </Typography>
          </Box>

          {/* Step 2 */}
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#4f46e5',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
                boxShadow: '0 6px 16px rgba(79, 70, 229, 0.3)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              Book Instantly
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6, mb: 2 }}>
              Schedule your appointment online or via our app with live IST calendar slots.
            </Typography>
            <Button
              variant="contained"
              onClick={() => search()}
              sx={{
                bgcolor: '#4f46e5',
                color: 'white',
                borderRadius: 9999,
                px: 2.5,
                py: 0.8,
                fontSize: '0.85rem',
                fontWeight: 700,
                '&:hover': { bgcolor: '#4338ca' },
              }}
            >
              Start Now ➔
            </Button>
          </Box>

          {/* Step 3 */}
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#ede9fe',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              Consult & Follow Up
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
              Get treatment, advice, and digital prescriptions with automated 24-hour reminder protection.
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* SECTION 5: SOCIAL PROOF & TESTIMONIALS ("PATIENTS LOVE DOCTIFY") */}
      <Box sx={{ bgcolor: '#f8fafc', py: 9, borderTop: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl">
          {/* Awards Badges Row */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: { xs: 2, md: 5 },
              flexWrap: 'wrap',
              mb: 4,
            }}
          >
            {['Best Doctor Website', 'Best Doctor Platform', 'Best Doctor Service'].map((award) => (
              <Box
                key={award}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 9999,
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <Typography sx={{ fontSize: 16 }}>🏆</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                  {award}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mb: 6 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '2.5rem' },
                color: '#0f172a',
                letterSpacing: '-0.02em',
                mb: 1.5,
              }}
            >
              Patients Love Doctify
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6, mb: 1 }}>
              Real stories from real patients who trust Doctify with their healthcare needs.
            </Typography>
            <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 700, fontSize: '0.9rem' }}>
              Trusted by 58,980+ users ★★★★★ 4.98/5 Rating
            </Typography>
          </Box>

          {/* Testimonials Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {/* Review 1 */}
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#4f46e5', fontWeight: 700 }}>MS</Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Marc Spector
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @jo_arche9 · Designer
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="Verified" size="small" color="success" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                </Box>
                <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7, fontSize: '0.95rem' }}>
                  "Doctify has completely revolutionized how our family schedules consultations. The intuitive design and robust features allowed us to streamline complex appointments that used to take hours."
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                  Amplitude
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dec 12, 2025
                </Typography>
              </Box>
            </Paper>

            {/* Review 2 */}
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#0284c7', fontWeight: 700 }}>AJ</Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Arc Joan
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @jo_arche9 · Developer
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="Verified" size="small" color="success" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                </Box>
                <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7, fontSize: '0.95rem' }}>
                  "What stands out about Doctify is how well it balances simplicity with functionality. As an engineer, I appreciate how sleek and intuitive the interface is. At the same time, it offers advanced features that meet every clinical need."
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                  veroxfloor
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dec 12, 2025
                </Typography>
              </Box>
            </Paper>

            {/* Review 3 */}
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#10b981', fontWeight: 700 }}>PS</Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Priya Sharma
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @priyasharma · Patient
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="Verified" size="small" color="success" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                </Box>
                <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7, fontSize: '0.95rem' }}>
                  "Booking a cardiologist at Apollo was done in under 60 seconds, and the 24-hour reminder made sure I never missed my visit. The digital prescription was sent to my email immediately after."
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                  Bangalore Resident
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Jan 15, 2026
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* SECTION 6: BOTTOM HERO CTA BANNER (VIBRANT ROYAL VIOLET FROM IMAGE) */}
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Box
          sx={{
            borderRadius: '28px',
            p: { xs: 4, md: 7 },
            bgcolor: '#4f3df7', // Royal violet banner from image
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 16px 40px -8px rgba(79, 61, 247, 0.4)',
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.2rem', md: '3rem' },
              color: 'white',
              letterSpacing: '-0.02em',
              mb: 1.5,
            }}
          >
            Patients Love Doctify
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#e0e7ff',
              fontSize: { xs: '1rem', md: '1.2rem' },
              maxWidth: 640,
              mx: 'auto',
              mb: 4,
            }}
          >
            Real stories from real patients who trust Doctify with their healthcare needs.
          </Typography>

          <Button
            variant="contained"
            onClick={() => search()}
            sx={{
              bgcolor: '#ffffff',
              color: '#4f3df7',
              borderRadius: 9999,
              px: 4,
              py: 1.6,
              fontSize: '1rem',
              fontWeight: 800,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              '&:hover': { bgcolor: '#f8fafc' },
            }}
          >
            Book Your Appointment Today ➔
          </Button>
        </Box>
      </Container>

      {/* Interactive Modals */}
      <TelehealthConsultModal
        open={telehealthOpen}
        onClose={() => setTelehealthOpen(false)}
      />

      <HowItWorksModal
        open={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        onStartBooking={() => search()}
      />

      <DigitalHealthRecordsModal
        open={recordsOpen}
        onClose={() => setRecordsOpen(false)}
      />
    </Box>
  );
}
