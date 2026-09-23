import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Avatar,
  TextField,
  Paper,
  Divider,
} from '@mui/material';

interface TelehealthConsultModalProps {
  open: boolean;
  onClose: () => void;
  doctorName?: string;
  specialty?: string;
}

export function TelehealthConsultModal({
  open,
  onClose,
  doctorName = 'Dr. Priya Kapoor',
  specialty = 'Cardiology Specialist',
}: TelehealthConsultModalProps) {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'notes' | 'chat'>('video');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Dr. Priya Kapoor', text: 'Hello! I am reviewing your recent ECG and blood pressure readings.', time: 'Just now' },
  ]);
  const [inputMsg, setInputMsg] = useState('');

  useEffect(() => {
    let timer: any;
    if (open) {
      setSeconds(0);
      timer = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [open]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const sendMessage = () => {
    if (!inputMsg.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: 'You', text: inputMsg, time: 'Just now' },
    ]);
    setInputMsg('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { sender: doctorName, text: 'Understood. Let me note this in your digital prescription.', time: 'Just now' },
      ]);
    }, 1200);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            bgcolor: '#090d16',
            color: 'white',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', minHeight: 520 }}>
        {/* Top Video Room Bar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#4f46e5', width: 36, height: 36, fontWeight: 700 }}>
              {doctorName[4] || 'D'}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                {doctorName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                {specialty} · Apollo Hospital
              </Typography>
            </Box>
            <Chip
              label={`HD Call · ${formatTime(seconds)}`}
              size="small"
              sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700, ml: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={activeTab === 'video' ? 'contained' : 'text'}
              onClick={() => setActiveTab('video')}
              sx={{ color: 'white', bgcolor: activeTab === 'video' ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: 2 }}
            >
              Video
            </Button>
            <Button
              size="small"
              variant={activeTab === 'chat' ? 'contained' : 'text'}
              onClick={() => setActiveTab('chat')}
              sx={{ color: 'white', bgcolor: activeTab === 'chat' ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: 2 }}
            >
              Chat
            </Button>
            <Button
              size="small"
              variant={activeTab === 'notes' ? 'contained' : 'text'}
              onClick={() => setActiveTab('notes')}
              sx={{ color: 'white', bgcolor: activeTab === 'notes' ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: 2 }}
            >
              Rx Note
            </Button>
          </Box>
        </Box>

        {/* Video Consultation Main Canvas */}
        {activeTab === 'video' && (
          <Box
            sx={{
              height: 480,
              width: '100%',
              bgcolor: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              backgroundImage: 'radial-gradient(circle at center, #1f2937 0%, #030712 100%)',
            }}
          >
            {/* Simulated Doctor Video Stream */}
            <Box sx={{ textAlign: 'center', zIndex: 2 }}>
              <Box
                sx={{
                  position: 'relative',
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  mx: 'auto',
                  mb: 2,
                  boxShadow: '0 0 0 8px rgba(79, 70, 229, 0.2)',
                  border: '3px solid #4f46e5',
                  overflow: 'hidden',
                }}
              >
                <img
                  src="/assets/hero_doctors_team.jpg"
                  alt={doctorName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                {doctorName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 600 }}>
                ● Audio & Video Connected (Secure 256-Bit Encrypted)
              </Typography>
            </Box>

            {/* Self Video PiP Thumbnail */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 84,
                right: 20,
                width: 130,
                height: 90,
                borderRadius: 3,
                bgcolor: '#1f2937',
                border: '2px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: 4,
                zIndex: 5,
              }}
            >
              {isVideoOff ? (
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Camera Off</Typography>
              ) : (
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="caption" sx={{ color: 'white', display: 'block', fontWeight: 600 }}>You</Typography>
                  <Typography variant="caption" sx={{ color: '#38bdf8', fontSize: 10 }}>Self Preview</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Clinical Chat Tab */}
        {activeTab === 'chat' && (
          <Box sx={{ height: 480, p: 3, pt: 9, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {chatMessages.map((msg, i) => (
                <Box
                  key={i}
                  sx={{
                    alignSelf: msg.sender === 'You' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: msg.sender === 'You' ? '#4f46e5' : '#1f2937',
                    color: 'white',
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', fontWeight: 600, fontSize: 11 }}>
                    {msg.sender} · {msg.time}
                  </Typography>
                  <Typography variant="body2">{msg.text}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Type your health concern or question..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                sx={{
                  bgcolor: '#1f2937',
                  borderRadius: 2,
                  input: { color: 'white' },
                  fieldset: { borderColor: '#374151' },
                }}
              />
              <Button variant="contained" onClick={sendMessage} sx={{ bgcolor: '#4f46e5' }}>
                Send
              </Button>
            </Box>
          </Box>
        )}

        {/* Digital Prescription Note Tab */}
        {activeTab === 'notes' && (
          <Box sx={{ height: 480, p: 3, pt: 9, overflowY: 'auto' }}>
            <Paper sx={{ p: 3, bgcolor: '#ffffff', color: '#0f172a', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', pb: 1.5, mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#4f46e5' }}>
                    Doctify Telehealth e-Prescription
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Digital Consultation ID: DOC-{Math.floor(100000 + Math.random() * 900000)}
                  </Typography>
                </Box>
                <Chip label="Digitally Signed" color="success" size="small" sx={{ fontWeight: 700 }} />
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Attending Physician: {doctorName} (MCI Reg. #54892)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Facility: Apollo Hospital, Bannerghatta Road, Bangalore
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Clinical Advice & Rx:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                1. <strong>Tab. Telmisartan 40mg</strong> - 1 tablet once daily morning after breakfast (30 days).
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                2. <strong>Tab. Rosuvastatin 10mg</strong> - 1 tablet once daily at bedtime (30 days).
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                3. Maintain daily BP log; low-sodium diet; routine 30-min brisk walk.
              </Typography>

              <Box sx={{ bgcolor: '#f1f5f9', p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  ✓ Follow-up scheduled in 4 weeks. Automated 24h SMS reminder will be dispatched before the scheduled visit.
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Video Control Bar at Bottom */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            p: 2,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Mute Audio */}
          <IconButton
            onClick={() => setIsMuted((m) => !m)}
            sx={{
              bgcolor: isMuted ? '#ef4444' : 'rgba(255,255,255,0.15)',
              color: 'white',
              width: 48,
              height: 48,
              '&:hover': { bgcolor: isMuted ? '#dc2626' : 'rgba(255,255,255,0.25)' },
            }}
          >
            {isMuted ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" x2="22" y1="2" y2="22" />
                <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                <path d="M5 10v2a7 7 0 0 0 12 5" />
                <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
          </IconButton>

          {/* Toggle Video */}
          <IconButton
            onClick={() => setIsVideoOff((v) => !v)}
            sx={{
              bgcolor: isVideoOff ? '#ef4444' : 'rgba(255,255,255,0.15)',
              color: 'white',
              width: 48,
              height: 48,
              '&:hover': { bgcolor: isVideoOff ? '#dc2626' : 'rgba(255,255,255,0.25)' },
            }}
          >
            {isVideoOff ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" x2="22" y1="2" y2="22" />
                <path d="m16 16-1.5-1.5" />
                <path d="m22 7-6 5v4" />
                <rect width="14" height="12" x="2" y="6" rx="2" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m22 7-6 5 6 5V7Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" />
              </svg>
            )}
          </IconButton>

          {/* End Call Button */}
          <Button
            variant="contained"
            color="error"
            onClick={onClose}
            sx={{
              bgcolor: '#ef4444',
              borderRadius: 9999,
              px: 3,
              fontWeight: 700,
              gap: 1,
              '&:hover': { bgcolor: '#dc2626' },
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.28 8.84 7.42 7 12 7s8.72 1.84 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29s-.52-.11-.7-.28c-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
            End Call
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
