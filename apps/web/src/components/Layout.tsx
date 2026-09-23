import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Select,
  MenuItem,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext.js';
import { LANGUAGES } from '../i18n/index.js';

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Hospitals & Map', path: '/hospitals' },
    { label: 'Doctors', path: '/doctors' },
    { label: 'Appointments', path: '/bookings' },
    { label: 'Medical Records', path: '/medical-records' },
    { label: 'Services', path: '/#services' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
      {/* Doctify Header Navigation */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #f1f5f9',
          color: '#0f172a',
          zIndex: 1100,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ height: 74, display: 'flex', justifyContent: 'space-between' }}>
            {/* Logo */}
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  bgcolor: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#1e1b4b',
                  fontSize: '1.45rem',
                }}
              >
                Doctify
              </Typography>
            </Box>

            {/* Desktop Navigation Links */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 3.5,
              }}
            >
              {navLinks.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Typography
                    key={item.label}
                    component={RouterLink}
                    to={item.path}
                    sx={{
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#4f46e5' : '#475569',
                      transition: 'color 0.15s ease',
                      '&:hover': {
                        color: '#1e1b4b',
                      },
                    }}
                  >
                    {item.label}
                  </Typography>
                );
              })}

              {/* Doctor / Admin Portal Shortcuts */}
              {user?.role === 'DOCTOR' && (
                <Chip
                  component={RouterLink}
                  to="/doctor"
                  clickable
                  label="🩺 Doctor Portal"
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600, cursor: 'pointer' }}
                />
              )}
              {user?.role === 'ADMIN' && (
                <Chip
                  component={RouterLink}
                  to="/admin"
                  clickable
                  label="⚡ Admin"
                  color="secondary"
                  size="small"
                  sx={{ fontWeight: 600, cursor: 'pointer' }}
                />
              )}
            </Box>

            {/* Right Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Language Selector */}
              <Select
                value={i18n.language}
                onChange={(e) => void i18n.changeLanguage(e.target.value)}
                size="small"
                sx={{
                  display: { xs: 'none', lg: 'inline-flex' },
                  fontSize: '0.85rem',
                  borderRadius: 9999,
                  height: 38,
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                }}
              >
                {LANGUAGES.map((l) => (
                  <MenuItem key={l.code} value={l.code}>
                    {l.label}
                  </MenuItem>
                ))}
              </Select>

              {user ? (
                <>
                  <Chip
                    label={user.role === 'DOCTOR' ? 'Dr. ' + user.email.split('@')[0] : user.email.split('@')[0]}
                    size="medium"
                    component={RouterLink}
                    to="/profile"
                    clickable
                    sx={{
                      bgcolor: '#f1f5f9',
                      fontWeight: 600,
                      color: '#0f172a',
                      height: 40,
                      borderRadius: 9999,
                      px: 0.5,
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      await logout();
                      nav('/');
                    }}
                    sx={{
                      borderRadius: 9999,
                      borderColor: '#e2e8f0',
                      color: '#475569',
                      fontSize: '0.9rem',
                      height: 40,
                      px: 2,
                      '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  {/* Sign up button */}
                  <Button
                    component={RouterLink}
                    to="/register"
                    variant="outlined"
                    sx={{
                      borderRadius: 9999,
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      bgcolor: '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      height: 42,
                      px: 2.8,
                      '&:hover': {
                        bgcolor: '#f8fafc',
                        borderColor: '#cbd5e1',
                      },
                    }}
                  >
                    Sign up
                  </Button>

                  {/* Login button */}
                  <Button
                    component={RouterLink}
                    to="/login"
                    variant="contained"
                    sx={{
                      borderRadius: 9999,
                      bgcolor: '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      height: 42,
                      px: 3,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      '&:hover': {
                        bgcolor: '#1e293b',
                      },
                    }}
                  >
                    Login
                  </Button>
                </>
              )}

              {/* Mobile menu toggle */}
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{ display: { xs: 'flex', md: 'none' }, color: '#0f172a' }}
                aria-label="Open menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 280, p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#4f46e5', mb: 2 }}>
            Doctify
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List>
            {navLinks.map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                >
                  <ListItemText primary={<Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>} />
                </ListItemButton>
              </ListItem>
            ))}
            {user?.role === 'DOCTOR' && (
              <ListItem disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to="/doctor"
                  onClick={() => setMobileOpen(false)}
                >
                  <ListItemText primary={<Typography sx={{ fontWeight: 700, color: '#4f46e5' }}>🩺 Doctor Portal</Typography>} />
                </ListItemButton>
              </ListItem>
            )}
            {user?.role === 'ADMIN' && (
              <ListItem disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                >
                  <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>⚡ Admin Dashboard</Typography>} />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>

      {/* Main Page Body */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>

      {/* Doctify Footer */}
      <Box component="footer" sx={{ bgcolor: '#0f172a', color: '#94a3b8', pt: 8, pb: 6, mt: 'auto' }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1.5fr' },
              gap: 4,
              mb: 6,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                  Doctify
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 320, lineHeight: 1.7, mb: 2 }}>
                Connecting patients with certified medical specialists across Bangalore for in-person visits and instant online consultations.
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                Emergency Helpline: <strong>112</strong> · Hospital Ambulance Support
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                Services
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography component={RouterLink} to="/#services" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>General Consultations</Typography>
                <Typography component={RouterLink} to="/#services" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>Pediatrics Care</Typography>
                <Typography component={RouterLink} to="/#services" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>Cardiology & Heart</Typography>
                <Typography component={RouterLink} to="/#services" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>Dental Health</Typography>
                <Typography component={RouterLink} to="/#services" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>Diagnostics & Lab Tests</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                Platform
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography component={RouterLink} to="/doctors" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>Browse Certified Doctors</Typography>
                <Typography component={RouterLink} to="/hospitals" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>Bangalore Hospitals</Typography>
                <Typography component={RouterLink} to="/bookings" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>My Appointments</Typography>
                <Typography component={RouterLink} to="/doctor" sx={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'white' } }}>Doctor Portal</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                Quality & Compliance
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, mb: 1.5 }}>
                All consultations adhere to Indian Telemedicine Practice Guidelines and DPDP 2023 patient privacy requirements.
              </Typography>
              <Chip
                label="Automated 24h Reminder Cron Enabled"
                size="small"
                sx={{ bgcolor: 'rgba(79, 70, 229, 0.25)', color: '#a5b4fc', fontWeight: 600, fontSize: 11 }}
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#1e293b', mb: 4 }} />

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              fontSize: 13,
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              © {new Date().getFullYear()} Doctify Healthcare Ltd. All rights reserved. Real-time IST availability.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography component={RouterLink} to="/privacy" sx={{ color: '#64748b', textDecoration: 'none', fontSize: 13, '&:hover': { color: 'white' } }}>Privacy Policy</Typography>
              <Typography component={RouterLink} to="/terms" sx={{ color: '#64748b', textDecoration: 'none', fontSize: 13, '&:hover': { color: 'white' } }}>Terms of Service</Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
