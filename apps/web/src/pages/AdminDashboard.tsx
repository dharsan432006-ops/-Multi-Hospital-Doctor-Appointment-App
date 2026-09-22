import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiFetch, apiFetchPage } from '../api/client.js';
import { UnverifiedBadge, DemoBadge } from '../components/Badges.js';
import { Empty, Loading, LoadError } from '../components/States.js';
import type { Doctor, Hospital } from '../api/types.js';

interface Report { total: number; byDay: Record<string, number>; byStatus: Record<string, number>; byHospital: Record<string, number>; bySpecialty: Record<string, number> }
interface AdminUser { id: string; email: string; role: string; isActive: boolean; createdAt: string }
interface Audit { id: string; action: string; entityType: string; entityId: string; createdAt: string }

const COLORS = ['#1565c0', '#00838f', '#6a1b9a', '#ef6c00', '#2e7d32'];

export function AdminDashboard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState('');

  const hospitals = useQuery({ queryKey: ['adminHosp'], queryFn: () => apiFetchPage<Hospital>('/hospitals?pageSize=100'), enabled: tab === 0 });
  const doctors = useQuery({ queryKey: ['adminDocs'], queryFn: () => apiFetchPage<Doctor>('/doctors?pageSize=100'), enabled: tab === 1 });
  const report = useQuery({ queryKey: ['report'], queryFn: () => apiFetch<Report>('/admin/reports/bookings'), enabled: tab === 2 });
  const users = useQuery({ queryKey: ['adminUsers'], queryFn: () => apiFetchPage<AdminUser>('/admin/users?pageSize=50'), enabled: tab === 3 });
  const audits = useQuery({ queryKey: ['audits'], queryFn: () => apiFetchPage<Audit>('/admin/audit-logs?pageSize=50'), enabled: tab === 4 });

  const [hName, setHName] = useState('');
  const [hType, setHType] = useState('PRIVATE');
  const createHospital = async () => {
    try {
      await apiFetch('/hospitals', { method: 'POST', body: JSON.stringify({ name: hName, type: hType }) });
      setHName(''); setMsg('Hospital created (unverified by default — fill details via Edit below)');
      qc.invalidateQueries({ queryKey: ['adminHosp'] });
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); }
  };

  const toggleVerify = async (h: Hospital) => {
    try {
      setMsg('');
      await apiFetch(`/hospitals/${h.id}`, { method: 'PUT', body: JSON.stringify({ dataVerified: !h.dataVerified }) });
      qc.invalidateQueries({ queryKey: ['adminHosp'] });
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); }
  };

  const setRole = useMutation({
    mutationFn: (v: { id: string; role: string }) => apiFetch(`/admin/users/${v.id}/role`, { method: 'PATCH', body: JSON.stringify({ role: v.role }) }),
    onSuccess: () => { setMsg(''); qc.invalidateQueries({ queryKey: ['adminUsers'] }); },
    onError: (e) => setMsg(e instanceof Error ? e.message : 'Role change failed'),
  });

  const [csvPending, setCsvPending] = useState(false);
  const downloadCsv = async () => {
    if (csvPending) return;
    setCsvPending(true);
    setMsg('');
    try {
      // Same auth flow as apiFetch (Bearer + httpOnly refresh cookie), requesting a blob.
      const doFetch = async (): Promise<Response> => {
        const { getAccessToken } = await import('../api/client.js');
        const base = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
        return fetch(`${base}/admin/reports/bookings?format=csv&pageSize=200`, {
          headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
          credentials: 'include',
        });
      };
      let res = await doFetch();
      if (res.status === 401) {
        const base = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
        const r = await fetch(`${base}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (r.ok) {
          const j = (await r.json()) as { data?: { accessToken?: string } };
          const { setAccessToken } = await import('../api/client.js');
          if (j?.data?.accessToken) setAccessToken(j.data.accessToken);
          res = await doFetch();
        }
      }
      if (!res.ok) { setMsg(`CSV export failed (${res.status})`); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'bookings.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'CSV export failed');
    } finally {
      setCsvPending(false);
    }
  };

  const dayData = Object.entries(report.data?.byDay ?? {}).map(([day, bookings]) => ({ day, bookings }));
  const statusData = Object.entries(report.data?.byStatus ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('admin.title')}</Typography>
      {msg && <Alert severity="info" sx={{ mb: 1 }}>{msg}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab label="Hospitals" /><Tab label="Doctors" /><Tab label={t('admin.reports')} /><Tab label={t('admin.users')} /><Tab label={t('admin.audit')} />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
            <TextField label="New hospital name" value={hName} onChange={(e) => setHName(e.target.value)} fullWidth />
            <TextField select label="Type" value={hType} onChange={(e) => setHType(e.target.value)} sx={{ minWidth: 140 }}>
              <MenuItem value="PRIVATE">Private</MenuItem><MenuItem value="GOVERNMENT">Government</MenuItem>
            </TextField>
            <Button variant="contained" disabled={!hName} onClick={() => void createHospital()}>Add</Button>
          </Stack>
          {hospitals.isLoading && <Loading />}
          {hospitals.isError && <LoadError message="Failed to load hospitals" onRetry={() => void hospitals.refetch()} />}
          {(hospitals.data?.data.length ?? 0) === 0 && !hospitals.isLoading && !hospitals.isError && <Empty />}
          <Stack spacing={1}>
            {hospitals.data?.data.map((h) => (
              <Card key={h.id}><CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ flexGrow: 1 }}>{h.name} · {h.type}{h.address ? '' : ' · no address'}</Typography>
                  {!h.dataVerified && <UnverifiedBadge />}
                  <Button size="small" onClick={() => void toggleVerify(h)}>{h.dataVerified ? 'Mark unverified' : 'Mark verified'}</Button>
                </Stack>
              </CardContent></Card>
            ))}
          </Stack>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          {doctors.isLoading && <Loading />}
          {doctors.isError && <LoadError message="Failed to load doctors" onRetry={() => void doctors.refetch()} />}
          {(doctors.data?.data.length ?? 0) === 0 && !doctors.isLoading && !doctors.isError && <Empty />}
          <Stack spacing={1}>
            {doctors.data?.data.map((d) => (
              <Card key={d.id}><CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ flexGrow: 1 }}>{d.name} · {d.specialty}</Typography>
                  {d.isDemo && <DemoBadge />}
                </Stack>
              </CardContent></Card>
            ))}
          </Stack>
        </Box>
      )}

      {tab === 2 && (
        <Box>
          {report.isLoading && <Loading />}
          {report.isError && <LoadError message="Failed to load report" onRetry={() => void report.refetch()} />}
          {report.data && (
            <>
              <Typography>Total: {report.data.total} · Cancelled/No-show tracked in byStatus</Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>{t('admin.byDay')}</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dayData}><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="bookings" fill="#1565c0" /></BarChart>
              </ResponsiveContainer>
              <Typography variant="h6" sx={{ mt: 2 }}>By status</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={statusData} dataKey="value" nameKey="name" label>{statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
              <Typography variant="h6" sx={{ mt: 2 }}>{t('admin.byHospital')}</Typography>
              {Object.entries(report.data.byHospital).map(([h, c]) => <Typography key={h} variant="body2">{h}: {c}</Typography>)}
              <Typography variant="h6" sx={{ mt: 2 }}>{t('admin.bySpecialty')}</Typography>
              {Object.entries(report.data.bySpecialty).map(([s, c]) => <Typography key={s} variant="body2">{s}: {c}</Typography>)}
              <Button sx={{ mt: 2 }} variant="outlined" disabled={csvPending} onClick={() => void downloadCsv()}>{csvPending ? t('common.loading') : t('admin.exportCsv')}</Button>
            </>
          )}
        </Box>
      )}

      {tab === 3 && (
        <Stack spacing={1}>
          {users.isLoading && <Loading />}
          {users.isError && <LoadError message="Failed to load users" onRetry={() => void users.refetch()} />}
          {setRole.isError && <Alert severity="error">{setRole.error instanceof Error ? setRole.error.message : 'Role change failed'}</Alert>}
          {users.data?.data.map((u) => (
            <Card key={u.id}><CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography sx={{ flexGrow: 1 }}>{u.email} · {u.role}</Typography>
                {(['PATIENT', 'DOCTOR', 'ADMIN'] as const).map((r) => (
                  <Button key={r} size="small" disabled={u.role === r} onClick={() => setRole.mutate({ id: u.id, role: r })}>{r}</Button>
                ))}
              </Stack>
            </CardContent></Card>
          ))}
        </Stack>
      )}

      {tab === 4 && (
        <Stack spacing={1}>
          {audits.isLoading && <Loading />}
          {audits.isError && <LoadError message="Failed to load audit log" onRetry={() => void audits.refetch()} />}
          {(audits.data?.data.length ?? 0) === 0 && !audits.isLoading && !audits.isError && <Empty />}
          {audits.data?.data.map((a) => (
            <Typography key={a.id} variant="body2">{a.createdAt} · {a.action} · {a.entityType}/{a.entityId}</Typography>
          ))}
        </Stack>
      )}
    </Box>
  );
}
