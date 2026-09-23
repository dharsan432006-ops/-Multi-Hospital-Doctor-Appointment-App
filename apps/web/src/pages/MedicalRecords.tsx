import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { MedicalRecordsTimeline } from '../components/MedicalRecordsTimeline.js';

export function MedicalRecords() {
  return (
    <Box sx={{ py: 1 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/" color="inherit" underline="hover">
          Home
        </Link>
        <Link component={RouterLink} to="/bookings" color="inherit" underline="hover">
          Patient Portal
        </Link>
        <Typography color="text.primary">Medical Records</Typography>
      </Breadcrumbs>

      <MedicalRecordsTimeline />
    </Box>
  );
}
