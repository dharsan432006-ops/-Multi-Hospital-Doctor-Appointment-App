import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch, apiFetchPage, formatIST } from '../api/client.js';
import { Empty, Loading, LoadError } from '../components/States.js';
import type { Appointment, DoctorStats, ReminderLog } from '../api/types.js';

interface AffRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

interface Aff {
  id: string;
  hospitalId: string;
  schedulePending: boolean;
  hospital: { id: string; name: string };
  availabilityRules: AffRule[];
}

interface TimeOff {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PIE_COLORS = ['#1976d2', '#0288d1', '#0097a7', '#00796b', '#388e3c'];

export function DoctorPortal() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState<{ text: string; severity: 'success' | 'info' | 'error' } | null>(null);
  const [chartRange, setChartRange] = useState<'all' | 'upcoming'>('all');

  // Queries
  const appts = useQuery({
    queryKey: ['doctorAppts'],
    queryFn: () => apiFetchPage<Appointment>('/appointments?pageSize=100'),
  });

  const stats = useQuery({
    queryKey: ['doctorStats'],
    queryFn: () => apiFetch<DoctorStats>('/doctors/me/stats'),
    refetchInterval: 30000,
  });

  const reminderLogs = useQuery({
    queryKey: ['reminderLogs'],
    queryFn: () => apiFetch<ReminderLog[]>('/appointments/reminders/logs'),
  });

  const affs = useQuery({
    queryKey: ['myAff'],
    queryFn: () => apiFetch<Aff[]>('/doctors/me/availability'),
  });

  const timeOff = useQuery({
    queryKey: ['myTimeOff'],
    queryFn: () => apiFetch<TimeOff[]>('/doctors/me/time-off'),
  });

  // Mutations
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) =>
      apiFetch(`/appointments/${v.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: v.status }),
      }),
    onSuccess: () => {
      setMsg({ text: 'Appointment status updated', severity: 'success' });
      qc.invalidateQueries({ queryKey: ['doctorAppts'] });
      qc.invalidateQueries({ queryKey: ['doctorStats'] });
    },
    onError: (e) =>
      setMsg({ text: e instanceof Error ? e.message : 'Status update failed', severity: 'error' }),
  });

  const trigger24hReminders = useMutation({
    mutationFn: () =>
      apiFetch<{ sentCount: number; provider: string; reminders: any[] }>(
        '/appointments/reminders/process-24h',
        { method: 'POST' }
      ),
    onSuccess: (data) => {
      setMsg({
        text: `24-Hour Reminder Cron Triggered! ${data.sentCount} reminder(s) dispatched via ${data.provider}.`,
        severity: 'success',
      });
      qc.invalidateQueries({ queryKey: ['reminderLogs'] });
      qc.invalidateQueries({ queryKey: ['doctorStats'] });
    },
    onError: (e) =>
      setMsg({
        text: e instanceof Error ? e.message : 'Failed to run 24h reminder cron',
        severity: 'error',
      }),
  });

  // Availability state
  const [editHosp, setEditHosp] = useState('');
  const [editRules, setEditRules] = useState<AffRule[]>([]);
  const [ruleDraft, setRuleDraft] = useState<AffRule>({
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '16:00',
    slotMinutes: 20,
  });
  const [saving, setSaving] = useState(false);

  const loadHospRules = (hospitalId: string) => {
    setEditHosp(hospitalId);
    const found = (affs.data ?? []).find((x) => x.hospitalId === hospitalId);
    setEditRules(found ? [...found.availabilityRules] : []);
  };

  const addRule = () => {
    if (
      !/^([01]?\d|2[0-3]):[0-5]\d$/.test(ruleDraft.startTime) ||
      !/^([01]?\d|2[0-3]):[0-5]\d$/.test(ruleDraft.endTime)
    ) {
      setMsg({ text: 'Time must be HH:mm (00:00-23:59)', severity: 'error' });
      return;
    }
    if (ruleDraft.endTime <= ruleDraft.startTime) {
      setMsg({ text: 'End time must be after start time', severity: 'error' });
      return;
    }
    if (ruleDraft.slotMinutes < 5 || ruleDraft.slotMinutes > 120) {
      setMsg({ text: 'Slot length must be 5-120 minutes', severity: 'error' });
      return;
    }
    setMsg(null);
    setEditRules((r) => [...r, { ...ruleDraft }]);
  };

  const saveAvail = async () => {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch('/doctors/me/availability', {
        method: 'PUT',
        body: JSON.stringify({ hospitalId: editHosp, rules: editRules }),
      });
      setMsg({ text: 'Availability rules saved successfully', severity: 'success' });
      qc.invalidateQueries({ queryKey: ['myAff'] });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Save failed', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Time-off state
  const [offStart, setOffStart] = useState('');
  const [offEnd, setOffEnd] = useState('');
  const [offReason, setOffReason] = useState('');

  const toIso = (local: string): string | null => {
    if (!local) return null;
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const addOff = async () => {
    const startsAt = toIso(offStart);
    const endsAt = toIso(offEnd);
    if (!startsAt || !endsAt) {
      setMsg({ text: 'Pick valid start and end date/time', severity: 'error' });
      return;
    }
    if (endsAt <= startsAt) {
      setMsg({ text: 'Time-off end must be after start', severity: 'error' });
      return;
    }
    try {
      const res = await apiFetch<{ conflictingActiveAppointments?: number }>('/doctors/me/time-off', {
        method: 'POST',
        body: JSON.stringify({ startsAt, endsAt, reason: offReason || undefined }),
      });
      const n = res?.conflictingActiveAppointments ?? 0;
      setMsg({
        text:
          n > 0
            ? `Time-off added, but ${n} active booking(s) overlap — contact those patients to reschedule`
            : 'Time-off period recorded successfully',
        severity: n > 0 ? 'info' : 'success',
      });
      setOffStart('');
      setOffEnd('');
      setOffReason('');
      qc.invalidateQueries({ queryKey: ['myTimeOff'] });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Failed to add time-off', severity: 'error' });
    }
  };

  const statsData = stats.data;
  const filteredDailyLoads =
    chartRange === 'upcoming'
      ? statsData?.dailyLoads.filter((_, idx) => idx >= 2) ?? []
      : statsData?.dailyLoads ?? [];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                Doctor Portal
              </Typography>
              <Chip
                label="Cardiology Specialist"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
              />
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Asia/Kolkata (IST) · Practice Dashboard & 24h Patient Automated Reminders
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
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Chip
                label={`Provider: ${statsData?.summary.notificationProvider?.toUpperCase() || 'CONSOLE'}`}
                size="small"
                color="info"
                sx={{ bgcolor: 'white', color: '#0d47a1', fontWeight: 700 }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.85 }}>
                24h Reminder Cron Active
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => trigger24hReminders.mutate()}
              disabled={trigger24hReminders.isPending}
              sx={{
                bgcolor: '#ff9800',
                color: '#fff',
                fontWeight: 700,
                '&:hover': { bgcolor: '#f57c00' },
                boxShadow: 2,
              }}
            >
              {trigger24hReminders.isPending ? 'Checking 24h Window...' : 'Trigger 24h Reminders'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Global Alerts */}
      {msg && (
        <Alert
          severity={msg.severity}
          onClose={() => setMsg(null)}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          {msg.text}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 15 },
        }}
      >
        <Tab label="📊 Dashboard & Analytics" />
        <Tab label="📅 Appointments Schedule" />
        <Tab label="🔔 24h Reminder Cron Logs" />
        <Tab label="⏰ Weekly Availability" />
        <Tab label="🏖️ Time Off" />
      </Tabs>

      {/* TAB 0: DASHBOARD SUMMARY VIEW (RECHARTS) */}
      {tab === 0 && (
        <Stack spacing={3}>
          {stats.isLoading && <Loading />}
          {stats.isError && (
            <LoadError message="Failed to load dashboard metrics" onRetry={() => void stats.refetch()} />
          )}

          {statsData && (
            <>
              {/* KPI Summary Cards */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <Card sx={{ borderLeft: '4px solid #1976d2', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Today's Visits
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, my: 0.5, color: '#1976d2' }}>
                      {statsData.summary.todayCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Scheduled for consultation today
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ borderLeft: '4px solid #ff9800', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Next 24h Visits
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, my: 0.5, color: '#ed6c02' }}>
                      {statsData.summary.next24hCount}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label={`${statsData.summary.next24hRemindersSent} Reminders Sent`}
                        size="small"
                        color="success"
                        sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                      />
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ borderLeft: '4px solid #2e7d32', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Upcoming 7-Day Volume
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, my: 0.5, color: '#2e7d32' }}>
                      {statsData.summary.upcoming7DaysCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg ~{(statsData.summary.upcoming7DaysCount / 7).toFixed(1)} patients / day
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ borderLeft: '4px solid #7b1fa2', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Completion Rate
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, my: 0.5, color: '#7b1fa2' }}>
                      {statsData.summary.completionRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Completed vs scheduled visits
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Chart 1: Daily Appointment Load */}
              <Card sx={{ borderRadius: 2, p: 2 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      mb: 2,
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Daily Appointment Load
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Breakdown of patient consultations across days by booking status
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant={chartRange === 'all' ? 'contained' : 'outlined'}
                        onClick={() => setChartRange('all')}
                      >
                        Recent & Upcoming
                      </Button>
                      <Button
                        size="small"
                        variant={chartRange === 'upcoming' ? 'contained' : 'outlined'}
                        onClick={() => setChartRange('upcoming')}
                      >
                        Upcoming Only
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredDailyLoads}
                        margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 12, fill: '#555' }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#555' }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            `${value} patients`,
                            name.charAt(0).toUpperCase() + name.slice(1),
                          ]}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: 8,
                            border: '1px solid #ccc',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ paddingBottom: 10, fontSize: 13 }}
                        />
                        <Bar
                          dataKey="confirmed"
                          name="Confirmed"
                          stackId="a"
                          fill="#1976d2"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="completed"
                          name="Completed"
                          stackId="a"
                          fill="#2e7d32"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="noShow"
                          name="No-Show"
                          stackId="a"
                          fill="#ed6c02"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="cancelled"
                          name="Cancelled"
                          stackId="a"
                          fill="#d32f2f"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>

              {/* Chart 2: Upcoming Patient Volume & Capacity Forecast */}
              <Card sx={{ borderRadius: 2, p: 2 }}>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Upcoming Patient Volume Forecast & Capacity
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Projected daily booked volume compared to standard consultation slot capacity (12 slots/day)
                    </Typography>
                  </Box>

                  <Box sx={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={statsData.upcomingVolume}
                        margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="patientGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1976d2" stopOpacity={0.7} />
                            <stop offset="95%" stopColor="#1976d2" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 12, fill: '#555' }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#555' }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            `${value} slots`,
                            name === 'patients' ? 'Booked Patients' : 'Daily Slot Capacity',
                          ]}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: 8,
                            border: '1px solid #ccc',
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ paddingBottom: 10, fontSize: 13 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="patients"
                          name="Booked Patients"
                          stroke="#1976d2"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#patientGradient)"
                        />
                        <Line
                          type="monotone"
                          dataKey="capacity"
                          name="Max Slot Capacity"
                          stroke="#9c27b0"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>

              {/* Insights Row: Hospital Breakdown & Time of Day */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 3,
                }}
              >
                <Card sx={{ height: '100%', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      Hospital Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Active appointments grouped by affiliated Bangalore facility
                    </Typography>
                    <Box sx={{ width: '100%', height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statsData.hospitalBreakdown}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={45}
                            paddingAngle={4}
                            label={({ name, percent }: any) => `${name ?? ''} (${(((percent ?? 0) * 100)).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {statsData.hospitalBreakdown.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ height: '100%', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      Time-of-Day OPD Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Consultation volume across morning, afternoon, and evening slots
                    </Typography>
                    <Box sx={{ width: '100%', height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={statsData.timeSlotBreakdown}
                          margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e0e0e0" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis dataKey="slot" type="category" tick={{ fontSize: 11 }} width={120} />
                          <Tooltip />
                          <Bar dataKey="count" name="Patients" fill="#00897b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* 24-Hour Reminder Service Quick Status */}
              <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f0f7ff', border: '1px solid #bbdefb' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0d47a1' }}>
                        Automated 24h Reminder Cron Service
                      </Typography>
                      <Chip label="RUNNING" size="small" color="success" sx={{ height: 22, fontWeight: 700 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Automatically queries scheduled visits in the 24-hour window and dispatches email & SMS alerts using the configured provider settings ({statsData.summary.notificationProvider}).
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={() => setTab(2)}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    View Reminder Logs ({reminderLogs.data?.length ?? 0})
                  </Button>
                </Box>
              </Paper>
            </>
          )}
        </Stack>
      )}

      {/* TAB 1: APPOINTMENTS LIST */}
      {tab === 1 && (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            My Patient Appointments
          </Typography>
          {appts.isLoading && <Loading />}
          {appts.isError && (
            <LoadError message="Failed to load appointments" onRetry={() => void appts.refetch()} />
          )}
          {setStatus.isError && (
            <Alert severity="error">
              {setStatus.error instanceof Error ? setStatus.error.message : 'Status update failed'}
            </Alert>
          )}
          {appts.data && appts.data.data.length === 0 && !appts.isLoading && !appts.isError && (
            <Empty />
          )}
          {appts.data?.data.map((a: any) => {
            const isTomorrow =
              new Date(a.startsAt).getTime() - Date.now() > 20 * 3600_000 &&
              new Date(a.startsAt).getTime() - Date.now() < 28 * 3600_000;

            return (
              <Card key={a.id} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {a.patient?.name || 'Patient'} · {formatIST(a.startsAt)} IST
                        </Typography>
                        {isTomorrow && (
                          <Chip
                            label="24h Window"
                            size="small"
                            color="warning"
                            sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Doctor: {a.doctor?.name} · Hospital: {a.affiliation?.hospital?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Status: <strong>{a.status}</strong>
                        {a.reason ? ` · Reason: ${a.reason}` : ''}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: { xs: 1, sm: 0 } }}>
                      {(['CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const).map((s) => (
                        <Button
                          key={s}
                          size="small"
                          variant={a.status === s ? 'contained' : 'outlined'}
                          disabled={setStatus.isPending || a.status === s}
                          onClick={() => setStatus.mutate({ id: a.id, status: s })}
                        >
                          {s}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* TAB 2: 24-HOUR REMINDER CRON LOGS */}
      {tab === 2 && (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                24-Hour Appointment Reminder Delivery Service
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Audit trail of automated notifications sent 24 hours prior to scheduled consultations
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => trigger24hReminders.mutate()}
              disabled={trigger24hReminders.isPending}
              sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' }, fontWeight: 700 }}
            >
              {trigger24hReminders.isPending ? 'Processing...' : 'Run 24h Reminder Check'}
            </Button>
          </Box>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Provider Configuration & Scheduling Rules:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Target Window: Appointments scheduled 22 to 26 hours in advance (24h target).<br />
              • Consent Validation: Confirms patient communication preferences before dispatch.<br />
              • Multi-Channel: Dispatches SMS & Email via provider ({statsData?.summary.notificationProvider || 'Console Provider'}).<br />
              • Deduplication: Prevents repeat reminders for the same visit ID.
            </Typography>
          </Paper>

          {reminderLogs.isLoading && <Loading />}
          {reminderLogs.isError && (
            <LoadError message="Failed to load reminder logs" onRetry={() => void reminderLogs.refetch()} />
          )}

          {reminderLogs.data && reminderLogs.data.length === 0 && !reminderLogs.isLoading && (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="body1" color="text.secondary">
                No reminders dispatched yet. Click "Run 24h Reminder Check" to scan upcoming appointments.
              </Typography>
            </Paper>
          )}

          {reminderLogs.data && reminderLogs.data.length > 0 && (
            <Stack spacing={1.5}>
              {reminderLogs.data.map((log) => (
                <Card key={log.id} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={log.channel}
                            size="small"
                            color={log.channel === 'EMAIL' ? 'primary' : 'secondary'}
                            sx={{ height: 22, fontWeight: 700, fontSize: 11 }}
                          />
                          <Chip
                            label={log.status}
                            size="small"
                            color={log.status === 'SENT' ? 'success' : 'info'}
                            sx={{ height: 22, fontWeight: 600, fontSize: 11 }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {log.to} {log.patientName ? `(${log.patientName})` : ''}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {log.subject || log.body || '24h appointment reminder'}
                        </Typography>
                        {log.appointmentTime && (
                          <Typography variant="caption" color="text.secondary">
                            Consultation Time: {formatIST(log.appointmentTime)} IST
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Provider: {log.provider}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Sent: {new Date(log.sentAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {/* TAB 3: AVAILABILITY RULES */}
      {tab === 3 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Doctor Weekly Availability
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure clinic hours and time slot lengths across your affiliated hospitals
          </Typography>
          {affs.isLoading && <Loading />}
          {affs.isError && (
            <LoadError message="Failed to load availability" onRetry={() => void affs.refetch()} />
          )}

          <Stack spacing={1} sx={{ mb: 3 }}>
            {(affs.data ?? []).map((a) => (
              <Paper key={a.id} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {a.hospital.name}:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.schedulePending
                    ? 'Schedule pending confirmation'
                    : a.availabilityRules
                        .map((r) => `${DAYS[r.dayOfWeek]} ${r.startTime}-${r.endTime} (${r.slotMinutes}m)`)
                        .join(' · ')}
                </Typography>
              </Paper>
            ))}
          </Stack>

          <Paper sx={{ p: 3, maxWidth: 640, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Edit Hospital Availability Schedule
            </Typography>
            <Stack spacing={2}>
              <TextField
                select
                label={t('doctors.hospital')}
                value={editHosp}
                onChange={(e) => loadHospRules(e.target.value)}
                fullWidth
              >
                {(affs.data ?? []).map((a) => (
                  <MenuItem key={a.hospitalId} value={a.hospitalId}>
                    {a.hospital.name}
                  </MenuItem>
                ))}
              </TextField>

              {editRules.map((r, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1,
                    alignItems: 'center',
                    bgcolor: '#f9f9f9',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography sx={{ flexGrow: 1 }}>
                    {DAYS[r.dayOfWeek]} {r.startTime}-{r.endTime} · {r.slotMinutes} mins/slot
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setEditRules((x) => x.filter((_, j) => j !== i))}
                  >
                    {t('common.delete')}
                  </Button>
                </Box>
              ))}

              <Divider />

              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Add New Slot Rule
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1,
                }}
              >
                <TextField
                  select
                  label="Day"
                  value={ruleDraft.dayOfWeek}
                  onChange={(e) => setRuleDraft({ ...ruleDraft, dayOfWeek: Number(e.target.value) })}
                  sx={{ minWidth: 100 }}
                >
                  {DAYS.map((d, i) => (
                    <MenuItem key={d} value={i}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Start (HH:mm)"
                  value={ruleDraft.startTime}
                  onChange={(e) => setRuleDraft({ ...ruleDraft, startTime: e.target.value })}
                  placeholder="10:00"
                />
                <TextField
                  label="End (HH:mm)"
                  value={ruleDraft.endTime}
                  onChange={(e) => setRuleDraft({ ...ruleDraft, endTime: e.target.value })}
                  placeholder="16:00"
                />
                <TextField
                  label="Slot (min)"
                  type="number"
                  value={ruleDraft.slotMinutes}
                  onChange={(e) => setRuleDraft({ ...ruleDraft, slotMinutes: Number(e.target.value) })}
                  sx={{ maxWidth: 110 }}
                />
                <Button variant="outlined" onClick={addRule} sx={{ minWidth: 100 }}>
                  Add rule
                </Button>
              </Box>

              <Button
                variant="contained"
                disabled={!editHosp || saving}
                onClick={() => void saveAvail()}
                sx={{ mt: 1 }}
              >
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* TAB 4: TIME OFF */}
      {tab === 4 && (
        <Box sx={{ maxWidth: 700 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Scheduled Time-Off & Leaves
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage upcoming leaves and blackout dates to prevent patient bookings
          </Typography>

          {timeOff.isLoading && <Loading />}
          {timeOff.isError && (
            <LoadError message="Failed to load time-off" onRetry={() => void timeOff.refetch()} />
          )}

          <Stack spacing={1} sx={{ mb: 3 }}>
            {(timeOff.data ?? []).map((o) => (
              <Paper key={o.id} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {formatIST(o.startsAt)} → {formatIST(o.endsAt)}
                </Typography>
                {o.reason && (
                  <Typography variant="body2" color="text.secondary">
                    Reason: {o.reason}
                  </Typography>
                )}
              </Paper>
            ))}
            {(!timeOff.data || timeOff.data.length === 0) && !timeOff.isLoading && !timeOff.isError && (
              <Empty />
            )}
          </Stack>

          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Add Time-Off Period
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="From"
                type="datetime-local"
                value={offStart}
                onChange={(e) => setOffStart(e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="To"
                type="datetime-local"
                value={offEnd}
                onChange={(e) => setOffEnd(e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Reason (optional)"
                value={offReason}
                onChange={(e) => setOffReason(e.target.value)}
                fullWidth
                placeholder="e.g. Conference, Personal leave"
              />
              <Button variant="contained" onClick={() => void addOff()} sx={{ alignSelf: 'flex-start' }}>
                Record Time-Off
              </Button>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
