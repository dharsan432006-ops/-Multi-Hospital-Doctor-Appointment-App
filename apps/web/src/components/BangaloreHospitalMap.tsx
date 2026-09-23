import React, { useState, useMemo, useCallback } from 'react';
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
  Paper,
  Alert,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import type { Hospital } from '../api/types.js';

// Haversine formula to compute distance between two lat/lng pairs in kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Preset popular Bangalore areas for quick geolocation simulation
const BANGALORE_AREAS = [
  { name: 'Bangalore City Center (MG Road / Richmond)', lat: 12.9716, lng: 77.5946 },
  { name: 'Koramangala (Sony World Signal)', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar (100ft Road)', lat: 12.9784, lng: 77.6408 },
  { name: 'HSR Layout (Sector 1)', lat: 12.9121, lng: 77.6446 },
  { name: 'Bannerghatta Road (Arekere)', lat: 12.8932, lng: 77.5976 },
  { name: 'Whitefield (ITPB / Hope Farm)', lat: 12.9698, lng: 77.7499 },
  { name: 'Jayanagar (4th Block)', lat: 12.9308, lng: 77.5838 },
  { name: 'Hebbal (Esteem Mall)', lat: 13.0358, lng: 77.597 },
  { name: 'Malleshwaram (Sampige Road)', lat: 13.0031, lng: 77.5643 },
  { name: 'Electronic City (Phase 1)', lat: 12.8452, lng: 77.6602 },
];

interface BangaloreHospitalMapProps {
  hospitals: Hospital[];
  selectedHospitalId?: string | null;
  onSelectHospital?: (hospital: Hospital | null) => void;
}

export function BangaloreHospitalMap({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
}: BangaloreHospitalMapProps) {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyDTfjPBRQWiw1EJLWNS5QfIq9eOvF3KjfU';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; label: string }>({
    lat: 12.9716,
    lng: 77.5946,
    label: 'Bangalore City Center (MG Road / Richmond)',
  });
  const [activeHospital, setActiveHospital] = useState<Hospital | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [geoNotice, setGeoNotice] = useState('');
  const [mapLoadError, setMapLoadError] = useState(false);

  // Sync selected hospital from parent if provided
  React.useEffect(() => {
    if (selectedHospitalId) {
      const match = hospitals.find((h) => h.id === selectedHospitalId);
      if (match) setActiveHospital(match);
    }
  }, [selectedHospitalId, hospitals]);

  // Request actual user geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    setGeoNotice('Locating your position in Bangalore...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Your Current Location',
        });
        setGeoNotice(`Located: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      () => {
        setLocatingUser(false);
        setGeoNotice('Could not retrieve browser location. Defaulting to Koramangala.');
        setUserLocation({ lat: 12.9352, lng: 77.6245, label: 'Koramangala (Sony World Signal)' });
      },
      { timeout: 7000 }
    );
  };

  // Filter and sort hospitals by proximity
  const enrichedHospitals = useMemo(() => {
    return hospitals
      .filter((h) => h.latitude != null && h.longitude != null)
      .map((h) => {
        const distance = calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          h.latitude!,
          h.longitude!
        );
        return {
          ...h,
          distanceKm: distance,
        };
      })
      .filter((h) => {
        const matchesQuery =
          h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          h.keySpecialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType =
          filterType === 'ALL' ||
          (filterType === 'PRIVATE' && h.type === 'PRIVATE') ||
          (filterType === 'GOVERNMENT' && h.type === 'GOVERNMENT');

        const matchesEmergency = !emergencyOnly || h.hasEmergency;

        return matchesQuery && matchesType && matchesEmergency;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [hospitals, userLocation, searchQuery, filterType, emergencyOnly]);

  const nearestHospital = enrichedHospitals[0] || null;

  const handleMarkerClick = useCallback(
    (hosp: Hospital) => {
      setActiveHospital(hosp);
      if (onSelectHospital) onSelectHospital(hosp);
    },
    [onSelectHospital]
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Controls & Location Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2.5,
          borderRadius: 3,
          bgcolor: 'white',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
              📍 Bangalore Healthcare Facilities Map
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Explore 20 verified hospitals, trauma centers & multispecialty facilities across Bengaluru.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            {/* Quick area select */}
            <TextField
              select
              size="small"
              label="Selected Location"
              value={userLocation.label}
              onChange={(e) => {
                const found = BANGALORE_AREAS.find((a) => a.name === e.target.value);
                if (found) {
                  setUserLocation({ lat: found.lat, lng: found.lng, label: found.name });
                  setGeoNotice(`Sorted by distance from ${found.name}`);
                }
              }}
              sx={{ minWidth: 220, bgcolor: '#f8fafc' }}
            >
              {BANGALORE_AREAS.map((a) => (
                <MenuItem key={a.name} value={a.name}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="contained"
              onClick={handleLocateMe}
              disabled={locatingUser}
              sx={{
                bgcolor: '#4f46e5',
                color: 'white',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#4338ca' },
              }}
            >
              {locatingUser ? 'Locating...' : '🎯 Use My Current Location'}
            </Button>
          </Box>
        </Box>

        {geoNotice && (
          <Alert severity="info" onClose={() => setGeoNotice('')} sx={{ mt: 2, py: 0.5 }}>
            {geoNotice}
          </Alert>
        )}

        {/* Filter controls */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            size="small"
            placeholder="Search by hospital name, area (e.g. Koramangala, Hebbal), or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 2, bgcolor: '#f8fafc' }}
          />

          <TextField
            select
            size="small"
            label="Facility Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            sx={{ flex: 1, minWidth: 140, bgcolor: '#f8fafc' }}
          >
            <MenuItem value="ALL">All Facilities</MenuItem>
            <MenuItem value="PRIVATE">Private Hospitals</MenuItem>
            <MenuItem value="GOVERNMENT">Government Hospitals</MenuItem>
          </TextField>

          <Button
            variant={emergencyOnly ? 'contained' : 'outlined'}
            color={emergencyOnly ? 'error' : 'inherit'}
            onClick={() => setEmergencyOnly(!emergencyOnly)}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}
          >
            🚨 24x7 Emergency Only
          </Button>
        </Stack>
      </Paper>

      {/* Main Split Layout: Left List + Right Interactive Map */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2.5 }}>
        {/* Left Side: Nearest Hospital list */}
        <Box sx={{ width: { xs: '100%', lg: '38%' }, maxHeight: { lg: 680 }, overflowY: 'auto', pr: { lg: 1 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Hospitals Sorted by Proximity ({enrichedHospitals.length})
            </Typography>
            {nearestHospital && (
              <Chip
                label={`Closest: ${nearestHospital.distanceKm} km`}
                size="small"
                color="success"
                sx={{ fontWeight: 700 }}
              />
            )}
          </Box>

          <Stack spacing={1.5}>
            {enrichedHospitals.map((hosp: any, idx: number) => {
              const isSelected = activeHospital?.id === hosp.id;
              const isNearest = idx === 0;

              return (
                <Card
                  key={hosp.id}
                  onClick={() => handleMarkerClick(hosp)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2.5,
                    border: '1.5px solid',
                    borderColor: isSelected ? '#4f46e5' : isNearest ? '#10b981' : '#e2e8f0',
                    bgcolor: isSelected ? '#eef2ff' : 'white',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
                    '&:hover': {
                      borderColor: '#4f46e5',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {hosp.name}
                          </Typography>
                          {isNearest && (
                            <Chip label="NEAREST" size="small" sx={{ bgcolor: '#10b981', color: 'white', fontWeight: 800, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {hosp.branch ? `${hosp.branch} · ` : ''}{hosp.type === 'GOVERNMENT' ? 'Govt Institute' : 'Private Multispecialty'}
                        </Typography>
                      </Box>

                      <Chip
                        label={`${hosp.distanceKm} km away`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: isNearest ? '#dcfce7' : '#f1f5f9',
                          color: isNearest ? '#15803d' : '#475569',
                        }}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.82rem', mb: 1 }}>
                      {hosp.address || 'Bangalore, Karnataka'}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {hosp.hasEmergency && (
                        <Chip label="24x7 Emergency" size="small" color="error" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                      )}
                      {hosp.beds && (
                        <Chip label={`${hosp.beds} Beds`} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#f1f5f9' }} />
                      )}
                      {hosp.keySpecialties?.slice(0, 2).map((s: string) => (
                        <Chip key={s} label={s} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#e2e8f0' }} />
                      ))}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button
                        size="small"
                        component="a"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${hosp.latitude},${hosp.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                      >
                        🧭 Directions
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        component={RouterLink}
                        to={`/hospitals/${hosp.id}`}
                        sx={{ fontSize: '0.75rem', textTransform: 'none', bgcolor: '#4f46e5' }}
                      >
                        View & Book
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Box>

        {/* Right Side: Interactive Google Map */}
        <Box
          sx={{
            width: { xs: '100%', lg: '62%' },
            height: 680,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
            position: 'relative',
          }}
        >
          {!mapLoadError ? (
            <APIProvider apiKey={apiKey} libraries={['marker']}>
              <Map
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                mapId={'DEMO_MAP_ID'}
                defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
                center={
                  activeHospital && activeHospital.latitude && activeHospital.longitude
                    ? { lat: activeHospital.latitude, lng: activeHospital.longitude }
                    : { lat: userLocation.lat, lng: userLocation.lng }
                }
                defaultZoom={12}
                gestureHandling={'greedy'}
                disableDefaultUI={false}
                style={{ width: '100%', height: '100%' }}
              >
                {/* User location pin */}
                <AdvancedMarker
                  position={{ lat: userLocation.lat, lng: userLocation.lng }}
                  title="Your Selected Reference Location"
                >
                  <Pin background={'#2563eb'} borderColor={'#1d4ed8'} glyphColor={'#ffffff'} scale={1.2}>
                    📍
                  </Pin>
                </AdvancedMarker>

                {/* Hospital markers */}
                {enrichedHospitals.map((hosp: any) => {
                  const isSelected = activeHospital?.id === hosp.id;
                  const isGovt = hosp.type === 'GOVERNMENT';

                  return (
                    <AdvancedMarker
                      key={hosp.id}
                      position={{ lat: hosp.latitude!, lng: hosp.longitude! }}
                      title={hosp.name}
                      onClick={() => handleMarkerClick(hosp)}
                    >
                      <Pin
                        background={isSelected ? '#4f46e5' : isGovt ? '#059669' : '#dc2626'}
                        borderColor={isSelected ? '#312e81' : '#ffffff'}
                        glyphColor={'#ffffff'}
                        scale={isSelected ? 1.3 : 1.0}
                      >
                        {hosp.hasEmergency ? '🏥' : '🩺'}
                      </Pin>
                    </AdvancedMarker>
                  );
                })}

                {/* Active Hospital InfoWindow */}
                {activeHospital && activeHospital.latitude && activeHospital.longitude && (
                  <InfoWindow
                    position={{ lat: activeHospital.latitude, lng: activeHospital.longitude }}
                    onCloseClick={() => setActiveHospital(null)}
                    maxWidth={320}
                  >
                    <Box sx={{ p: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {activeHospital.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 0.5 }}>
                        {activeHospital.address}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        <Chip
                          label={activeHospital.type === 'GOVERNMENT' ? 'Govt' : 'Private'}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                        {activeHospital.hasEmergency && (
                          <Chip label="24x7 Emergency" size="small" color="error" sx={{ fontSize: '0.65rem', height: 18 }} />
                        )}
                        {activeHospital.beds && (
                          <Chip label={`${activeHospital.beds} Beds`} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          component="a"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${activeHospital.latitude},${activeHospital.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}
                        >
                          Directions
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          component={RouterLink}
                          to={`/hospitals/${activeHospital.id}`}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', bgcolor: '#4f46e5', py: 0.25 }}
                        >
                          Book Visit
                        </Button>
                      </Box>
                    </Box>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          ) : (
            // Graceful Spatial Map Fallback
            <Box
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
                🗺️ Bangalore Facilities Spatial View
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 450, mb: 2 }}>
                Use the facility locator on the left panel to browse all 20 Bangalore hospitals sorted by geodesic distance from your current neighborhood.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setMapLoadError(false)}
                sx={{ textTransform: 'none' }}
              >
                Reload Map
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
