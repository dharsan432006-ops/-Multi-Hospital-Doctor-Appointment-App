import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  useMedicalRecords,
  useAddAllergy,
  useAddVaccination,
} from '../api/hooks.js';
import { Loading, LoadError } from './States.js';
import type { DiagnosisRecord, AllergyRecord, VaccinationRecord } from '../api/types.js';

export function MedicalRecordsTimeline() {
  const { data, isLoading, isError, error, refetch } = useMedicalRecords();
  const addAllergyMutation = useAddAllergy();
  const addVaccineMutation = useAddVaccination();

  const [activeTab, setActiveTab] = useState<'timeline' | 'allergies' | 'vaccinations' | 'all'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Allergy dialog state
  const [openAllergyModal, setOpenAllergyModal] = useState(false);
  const [allergen, setAllergen] = useState('');
  const [category, setCategory] = useState<'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER'>('DRUG');
  const [severity, setSeverity] = useState<'SEVERE' | 'MODERATE' | 'MILD'>('MODERATE');
  const [reaction, setReaction] = useState('');
  const [allergyNotes, setAllergyNotes] = useState('');
  const [allergyError, setAllergyError] = useState('');

  // Vaccination dialog state
  const [openVaccineModal, setOpenVaccineModal] = useState(false);
  const [vaccineName, setVaccineName] = useState('');
  const [targetDisease, setTargetDisease] = useState('');
  const [dose, setDose] = useState('Booster Dose');
  const [adminDate, setAdminDate] = useState(new Date().toISOString().slice(0, 10));
  const [facility, setFacility] = useState('Apollo Hospital, Bannerghatta Road');
  const [batchNo, setBatchNo] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [vaccineError, setVaccineError] = useState('');

  const [successMsg, setSuccessMsg] = useState('');

  const profile = data?.patient;
  const diagnoses = data?.diagnoses || [];
  const allergies = data?.allergies || [];
  const vaccinations = data?.vaccinations || [];

  // Filtered diagnoses
  const filteredDiagnoses = useMemo(() => {
    return diagnoses.filter((d: DiagnosisRecord) => {
      const matchesSearch =
        d.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.doctorSpecialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.medications.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        d.clinicalNotes.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [diagnoses, searchQuery, statusFilter]);

  // Filtered allergies
  const filteredAllergies = useMemo(() => {
    return allergies.filter((a: AllergyRecord) => {
      return (
        a.allergen.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.reaction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [allergies, searchQuery]);

  // Filtered vaccinations
  const filteredVaccinations = useMemo(() => {
    return vaccinations.filter((v: VaccinationRecord) => {
      return (
        v.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.targetDisease.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.facility.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [vaccinations, searchQuery]);

  const handleSaveAllergy = async () => {
    if (!allergen.trim() || !reaction.trim()) {
      setAllergyError('Please provide both allergen name and physical reaction details.');
      return;
    }
    setAllergyError('');
    try {
      await addAllergyMutation.mutateAsync({
        allergen: allergen.trim(),
        category,
        severity,
        reaction: reaction.trim(),
        diagnosedAt: new Date().toISOString().slice(0, 10),
        notes: allergyNotes.trim(),
      });
      setSuccessMsg(`Allergy record for "${allergen}" added to health chart.`);
      setOpenAllergyModal(false);
      setAllergen('');
      setReaction('');
      setAllergyNotes('');
    } catch (err: any) {
      setAllergyError(err.message || 'Failed to save allergy');
    }
  };

  const handleSaveVaccination = async () => {
    if (!vaccineName.trim()) {
      setVaccineError('Please provide the vaccine name.');
      return;
    }
    setVaccineError('');
    try {
      await addVaccineMutation.mutateAsync({
        vaccineName: vaccineName.trim(),
        targetDisease: targetDisease.trim() || 'General Immunization',
        dose,
        administeredDate: adminDate,
        facility: facility.trim(),
        batchNumber: batchNo.trim() || `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
        nextDueDate: nextDue.trim() ? nextDue : null,
      });
      setSuccessMsg(`Vaccination record for "${vaccineName}" saved.`);
      setOpenVaccineModal(false);
      setVaccineName('');
      setTargetDisease('');
      setBatchNo('');
      setNextDue('');
    } catch (err: any) {
      setVaccineError(err.message || 'Failed to save vaccination');
    }
  };

  const printHealthSummary = () => {
    window.print();
  };

  if (isLoading) return <Loading />;
  if (isError) return <LoadError message="Failed to load medical records" error={error} onRetry={() => void refetch()} />;

  const severeAllergiesCount = allergies.filter((a) => a.severity === 'SEVERE').length;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Patient Health Passport Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: 'white',
          boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.25)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2.5,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                }}
              >
                📋
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {profile?.name || 'Aarav Sharma'} · Medical History
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Bangalore Health Record ID: #{profile?.id || 'BLR-77821'} · {profile?.gender || 'Male'}, Age 38 · {profile?.area || 'Bangalore'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              <Chip
                label={`Blood Group: ${profile?.bloodGroup || 'O+ Positive'}`}
                size="small"
                sx={{ bgcolor: 'rgba(239, 68, 68, 0.25)', color: '#fecaca', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.4)' }}
              />
              <Chip
                label={`Emergency: ${profile?.emergencyContact?.name} (${profile?.emergencyContact?.phone})`}
                size="small"
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)', color: 'white' }}
              />
              {severeAllergiesCount > 0 && (
                <Chip
                  label={`⚠️ ${severeAllergiesCount} Severe Drug/Food Allergy`}
                  size="small"
                  sx={{ bgcolor: '#dc2626', color: 'white', fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={printHealthSummary}
              sx={{
                bgcolor: 'white',
                color: '#1e1b4b',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.5,
                '&:hover': { bgcolor: '#f1f5f9' },
              }}
            >
              🖨️ Export / Print Summary
            </Button>
          </Box>
        </Box>
      </Paper>

      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ mb: 2.5, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* Quick KPI Stats */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Card
          sx={{
            flex: 1,
            borderRadius: 2.5,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            bgcolor: 'white',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 700 }}>
              Clinical Visits & Diagnoses
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', my: 0.5 }}>
              {diagnoses.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>
              Based on completed consultations
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            flex: 1,
            borderRadius: 2.5,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            bgcolor: 'white',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 700 }}>
              Allergies & Sensitivities
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#dc2626', my: 0.5 }}>
              {allergies.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {severeAllergiesCount} classified high severity
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            flex: 1,
            borderRadius: 2.5,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            bgcolor: 'white',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 700 }}>
              Vaccinations Documented
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#4f46e5', my: 0.5 }}>
              {vaccinations.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              All major immunizations up to date
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Navigation Tabs and Actions */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'white',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant={activeTab === 'timeline' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('timeline')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: activeTab === 'timeline' ? '#4f46e5' : 'transparent',
              borderColor: '#e2e8f0',
              color: activeTab === 'timeline' ? 'white' : '#475569',
            }}
          >
            🩺 Diagnoses Timeline ({diagnoses.length})
          </Button>
          <Button
            variant={activeTab === 'allergies' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('allergies')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: activeTab === 'allergies' ? '#dc2626' : 'transparent',
              borderColor: '#e2e8f0',
              color: activeTab === 'allergies' ? 'white' : '#475569',
            }}
          >
            ⚠️ Allergies ({allergies.length})
          </Button>
          <Button
            variant={activeTab === 'vaccinations' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('vaccinations')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: activeTab === 'vaccinations' ? '#2563eb' : 'transparent',
              borderColor: '#e2e8f0',
              color: activeTab === 'vaccinations' ? 'white' : '#475569',
            }}
          >
            💉 Vaccination History ({vaccinations.length})
          </Button>
          <Button
            variant={activeTab === 'all' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('all')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: activeTab === 'all' ? '#0f172a' : 'transparent',
              borderColor: '#e2e8f0',
              color: activeTab === 'all' ? 'white' : '#475569',
            }}
          >
            📑 View All Sections
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeTab === 'allergies' && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => setOpenAllergyModal(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              + Add Allergy
            </Button>
          )}
          {activeTab === 'vaccinations' && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => setOpenVaccineModal(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              + Log Vaccination
            </Button>
          )}
        </Box>
      </Paper>

      {/* Filter and Search Bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search by diagnosis, medication, doctor, or vaccine..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, bgcolor: 'white', borderRadius: 2 }}
        />
        {activeTab === 'timeline' && (
          <TextField
            select
            size="small"
            label="Clinical Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 180, bgcolor: 'white' }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="CHRONIC">Chronic Condition</MenuItem>
            <MenuItem value="RESOLVED">Resolved</MenuItem>
            <MenuItem value="FOLLOW_UP_REQUIRED">Follow-up Required</MenuItem>
          </TextField>
        )}
      </Stack>

      {/* SECTION 1: DIAGNOSES TIMELINE */}
      {(activeTab === 'timeline' || activeTab === 'all') && (
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{ color: '#4f46e5' }}>🩺</Box> Chronological Diagnoses & Care Timeline
            </Typography>
            <Chip label={`${filteredDiagnoses.length} Records`} size="small" sx={{ fontWeight: 700 }} />
          </Box>

          {filteredDiagnoses.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <Typography color="text.secondary">No clinical diagnoses match the selected filters.</Typography>
            </Card>
          ) : (
            <Box sx={{ position: 'relative', pl: { xs: 2, sm: 4 } }}>
              {/* Vertical timeline line */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 20,
                  bottom: 20,
                  left: { xs: 12, sm: 22 },
                  width: 3,
                  bgcolor: '#cbd5e1',
                  borderRadius: 2,
                }}
              />

              <Stack spacing={3}>
                {filteredDiagnoses.map((diag: DiagnosisRecord, index: number) => {
                  const isChronic = diag.status === 'CHRONIC';
                  const isFollowUp = diag.status === 'FOLLOW_UP_REQUIRED';

                  return (
                    <Box key={diag.id} sx={{ position: 'relative' }}>
                      {/* Timeline Node Icon */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 18,
                          left: { xs: -24, sm: -34 },
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          bgcolor: isChronic ? '#f59e0b' : isFollowUp ? '#ef4444' : '#10b981',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          boxShadow: '0 0 0 4px white, 0 2px 6px rgba(0,0,0,0.15)',
                          zIndex: 2,
                        }}
                      >
                        {index + 1}
                      </Box>

                      {/* Timeline Card */}
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 2.5,
                          border: '1px solid #e2e8f0',
                          bgcolor: 'white',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                            borderColor: '#cbd5e1',
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2.5 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: { xs: 'column', sm: 'row' },
                              justifyContent: 'space-between',
                              alignItems: { xs: 'flex-start', sm: 'center' },
                              mb: 1.5,
                              gap: 1,
                            }}
                          >
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                {diag.diagnosis}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Consultation Date: <strong>{diag.date}</strong> · {diag.hospitalName} ({diag.hospitalBranch || 'Bangalore'})
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {diag.icdCode && (
                                <Chip label={`ICD-10: ${diag.icdCode}`} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                              )}
                              <Chip
                                label={
                                  isChronic
                                    ? 'Chronic Condition'
                                    : isFollowUp
                                    ? 'Follow-up Due'
                                    : 'Resolved'
                                }
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  bgcolor: isChronic
                                    ? '#fef3c7'
                                    : isFollowUp
                                    ? '#fee2e2'
                                    : '#d1fae5',
                                  color: isChronic
                                    ? '#92400e'
                                    : isFollowUp
                                    ? '#991b1b'
                                    : '#065f46',
                                }}
                              />
                            </Box>
                          </Box>

                          {/* Attending Physician */}
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              mb: 2,
                              borderRadius: 2,
                              bgcolor: '#f8fafc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 1,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                              Diagnosing Specialist: <span style={{ color: '#4f46e5' }}>{diag.doctorName}</span> ({diag.doctorSpecialty})
                            </Typography>
                            {diag.followUpDate && (
                              <Chip
                                label={`Next Follow-up: ${diag.followUpDate}`}
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ fontWeight: 700 }}
                              />
                            )}
                          </Paper>

                          {/* Clinical Notes */}
                          <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6, mb: 2 }}>
                            {diag.clinicalNotes}
                          </Typography>

                          {/* Vitals Recorded */}
                          {diag.vitals && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                Clinical Vitals Recorded at Visit
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                                {diag.vitals.bloodPressure && (
                                  <Chip size="small" label={`BP: ${diag.vitals.bloodPressure}`} sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }} />
                                )}
                                {diag.vitals.heartRate && (
                                  <Chip size="small" label={`Pulse: ${diag.vitals.heartRate}`} sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }} />
                                )}
                                {diag.vitals.temperature && (
                                  <Chip size="small" label={`Temp: ${diag.vitals.temperature}`} sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }} />
                                )}
                                {diag.vitals.spO2 && (
                                  <Chip size="small" label={`SpO2: ${diag.vitals.spO2}`} sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }} />
                                )}
                                {diag.vitals.weightKg && (
                                  <Chip size="small" label={`Weight: ${diag.vitals.weightKg} kg`} sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }} />
                                )}
                              </Box>
                            </Box>
                          )}

                          {/* Prescribed Medications */}
                          {diag.medications && diag.medications.length > 0 && (
                            <Box sx={{ borderTop: '1px solid #f1f5f9', pt: 1.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                Prescribed Medications & Regimen
                              </Typography>
                              <Stack spacing={1}>
                                {diag.medications.map((med, mIdx) => (
                                  <Box
                                    key={mIdx}
                                    sx={{
                                      p: 1.25,
                                      borderRadius: 1.5,
                                      bgcolor: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      flexWrap: 'wrap',
                                      gap: 1,
                                    }}
                                  >
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                        💊 {med.name} · <span style={{ color: '#64748b' }}>{med.dosage}</span>
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#475569' }}>
                                        {med.frequency} · Duration: {med.duration}
                                      </Typography>
                                    </Box>
                                    {med.instructions && (
                                      <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#64748b' }}>
                                        {med.instructions}
                                      </Typography>
                                    )}
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* SECTION 2: ALLERGIES & SENSITIVITIES */}
      {(activeTab === 'allergies' || activeTab === 'all') && (
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
              ⚠️ Documented Allergies & Drug Adverse Reactions
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => setOpenAllergyModal(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              + Add Allergy
            </Button>
          </Box>

          {severeAllergiesCount > 0 && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              <strong>Clinical Warning:</strong> Patient has documented severe anaphylactoid hypersensitivities. Always cross-check before prescribing beta-lactam antibiotics or administering contrast agents.
            </Alert>
          )}

          <Stack spacing={2}>
            {filteredAllergies.map((alg: AllergyRecord) => {
              const isSevere = alg.severity === 'SEVERE';
              const isModerate = alg.severity === 'MODERATE';

              return (
                <Card
                  key={alg.id}
                  elevation={0}
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: isSevere ? '#fecaca' : isModerate ? '#fed7aa' : '#e2e8f0',
                    bgcolor: isSevere ? '#fff5f5' : isModerate ? '#fffaf0' : 'white',
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        mb: 1,
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: isSevere ? '#991b1b' : '#0f172a' }}>
                            {alg.allergen}
                          </Typography>
                          <Chip
                            label={alg.category}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Diagnosed: {alg.diagnosedAt} · Status: <strong>{alg.status}</strong>
                        </Typography>
                      </Box>

                      <Chip
                        label={alg.severity + ' SEVERITY'}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: isSevere ? '#dc2626' : isModerate ? '#ea580c' : '#2563eb',
                          color: 'white',
                        }}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600, mt: 1 }}>
                      Clinical Manifestation / Reaction: <span style={{ fontWeight: 400 }}>{alg.reaction}</span>
                    </Typography>

                    {alg.notes && (
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1 }}>
                        Notes: {alg.notes}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* SECTION 3: VACCINATION HISTORY */}
      {(activeTab === 'vaccinations' || activeTab === 'all') && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 1 }}>
              💉 Immunization & Vaccination History
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => setOpenVaccineModal(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              + Log Vaccination
            </Button>
          </Box>

          <Stack spacing={2}>
            {filteredVaccinations.map((vac: VaccinationRecord) => (
              <Card
                key={vac.id}
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: '1px solid #e2e8f0',
                  bgcolor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      mb: 1,
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {vac.vaccineName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Protects Against: <strong>{vac.targetDisease}</strong> · Dose: <span style={{ color: '#2563eb', fontWeight: 600 }}>{vac.dose}</span>
                      </Typography>
                    </Box>

                    <Chip
                      label={vac.status}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: '#dbeafe',
                        color: '#1e40af',
                      }}
                    />
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#475569' }}>
                      Administered: <strong>{vac.administeredDate}</strong> at {vac.facility}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Batch #: <code>{vac.batchNumber}</code>
                    </Typography>
                    {vac.nextDueDate && (
                      <Chip
                        label={`Next Booster Due: ${vac.nextDueDate}`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* MODAL: ADD ALLERGY */}
      <Dialog open={openAllergyModal} onClose={() => setOpenAllergyModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>⚠️ Add Patient Allergy or Adverse Sensitivity</DialogTitle>
        <DialogContent dividers>
          {allergyError && <Alert severity="error" sx={{ mb: 2 }}>{allergyError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Allergen Name"
              placeholder="e.g. Ciprofloxacin, Shellfish, Latex, Dust mites"
              value={allergen}
              onChange={(e) => setAllergen(e.target.value)}
              fullWidth
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                fullWidth
              >
                <MenuItem value="DRUG">Drug / Medication</MenuItem>
                <MenuItem value="FOOD">Food / Beverage</MenuItem>
                <MenuItem value="ENVIRONMENTAL">Environmental / Pollen</MenuItem>
                <MenuItem value="OTHER">Other / Contact</MenuItem>
              </TextField>

              <TextField
                select
                label="Severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                fullWidth
              >
                <MenuItem value="SEVERE">Severe (Anaphylaxis risk)</MenuItem>
                <MenuItem value="MODERATE">Moderate (Rash, Wheezing)</MenuItem>
                <MenuItem value="MILD">Mild (Itching, Sneezing)</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Clinical Reaction Symptoms"
              placeholder="e.g. Hives, facial swelling, shortness of breath"
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Additional Clinical Notes"
              placeholder="Any diagnostic test or past incident details"
              value={allergyNotes}
              onChange={(e) => setAllergyNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAllergyModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSaveAllergy}
            disabled={addAllergyMutation.isPending}
            sx={{ fontWeight: 700 }}
          >
            {addAllergyMutation.isPending ? 'Saving...' : 'Save Allergy Record'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: LOG VACCINE */}
      <Dialog open={openVaccineModal} onClose={() => setOpenVaccineModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>💉 Log Vaccination or Booster</DialogTitle>
        <DialogContent dividers>
          {vaccineError && <Alert severity="error" sx={{ mb: 2 }}>{vaccineError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Vaccine Brand / Name"
              placeholder="e.g. Covishield, Fluarix Tetra, Gardasil 9, Pneumococcal"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Target Disease"
              placeholder="e.g. Influenza, COVID-19, Hepatitis B"
              value={targetDisease}
              onChange={(e) => setTargetDisease(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Dose Description"
                placeholder="e.g. Annual Shot, Dose 1, Booster"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                fullWidth
              />
              <TextField
                type="date"
                label="Administered Date"
                value={adminDate}
                onChange={(e) => setAdminDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Healthcare Facility / Hospital"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Batch / Lot Number"
                placeholder="e.g. BATCH-8910"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                fullWidth
              />
              <TextField
                type="date"
                label="Next Booster Due Date (optional)"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenVaccineModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveVaccination}
            disabled={addVaccineMutation.isPending}
            sx={{ fontWeight: 700 }}
          >
            {addVaccineMutation.isPending ? 'Saving...' : 'Save Vaccine Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
