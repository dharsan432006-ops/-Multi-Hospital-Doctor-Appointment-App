import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch, apiFetchPage, formatIST } from '../api/client.js';
import { Empty, Loading, LoadError } from '../components/States.js';
import type { Appointment } from '../api/types.js';

interface AffRule { dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number }
interface Aff { id: string; hospitalId: string; schedulePending: boolean; hospital: { id: string; name: string }; availabilityRules: AffRule[] }
interface TimeOff { id: string; startsAt: string; endsAt: string; reason: string | null }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DoctorPortal() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState('');

  const appts = useQuery({ queryKey: ['doctorAppts'], queryFn: () => apiFetchPage<Appointment>('/appointments?pageSize=100') });
  const affs = useQuery({ queryKey: ['myAff'], queryFn: () => apiFetch<Aff[]>('/doctors/me/availability') });
  const timeOff = useQuery({ queryKey: ['myTimeOff'], queryFn: () => apiFetch<TimeOff[]>('/doctors/me/time-off') });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => apiFetch(`/appointments/${v.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: v.status }) }),
    onSuccess: () => { setMsg(''); qc.invalidateQueries({ queryKey: ['doctorAppts'] }); },
    onError: (e) => setMsg(e instanceof Error ? e.message : 'Status update failed'),
  });

  const [editHosp, setEditHosp] = useState('');
  const [editRules, setEditRules] = useState<AffRule[]>([]);
  const [ruleDraft, setRuleDraft] = useState<AffRule>({ dayOfWeek: 1, startTime: '10:00', endTime: '16:00', slotMinutes: 20 });
  const [saving, setSaving] = useState(false);

  const loadHospRules = (hospitalId: string) => {
    setEditHosp(hospitalId);
    const found = (affs.data ?? []).find((x) => x.hospitalId === hospitalId);
    setEditRules(found ? [...found.availabilityRules] : []);
  };

  const addRule = () => {
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(ruleDraft.startTime) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(ruleDraft.endTime)) {
      setMsg('Time must be HH:mm (00:00-23:59)');
      return;
    }
    if (ruleDraft.endTime <= ruleDraft.startTime) {
      setMsg('End time must be after start time');
      return;
    }
    if (ruleDraft.slotMinutes < 5 || ruleDraft.slotMinutes > 120) {
      setMsg('Slot length must be 5-120 minutes');
      return;
    }
    setMsg('');
    setEditRules((r) => [...r, { ...ruleDraft }]);
  };

  const saveAvail = async () => {
    if (saving) return;
    setSaving(true);
    setMsg('');
    try {
      await apiFetch('/doctors/me/availability', { method: 'PUT', body: JSON.stringify({ hospitalId: editHosp, rules: editRules }) });
      setMsg('Availability saved');
      qc.invalidateQueries({ queryKey: ['myAff'] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

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
    if (!startsAt || !endsAt) { setMsg('Pick valid start and end date/time'); return; }
    if (endsAt <= startsAt) { setMsg('Time-off end must be after start'); return; }
    try {
      const res = await apiFetch<{ conflictingActiveAppointments?: number }>('/doctors/me/time-off', { method: 'POST', body: JSON.stringify({ startsAt, endsAt, reason: offReason || undefined }) });
      const n = (res as { conflictingActiveAppointments?: number })?.conflictingActiveAppointments ?? 0;
      setMsg(n > 0 ? `Time-off added, but ${n} active booking(s) overlap — contact those patients to reschedule` : 'Time-off added');
      setOffStart(''); setOffEnd(''); setOffReason('');
      qc.invalidateQueries({ queryKey: ['myTimeOff'] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('doctor.title')}</Typography>
      {msg && <Alert severity="info" sx={{ mb: 1 }}>{msg}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('doctor.myAppointments')} />
        <Tab label={t('doctor.availability')} />
        <Tab label={t('doctor.timeOff')} />
      </Tabs>
      {tab === 0 && (
        <Stack spacing={2}>
          {appts.isLoading && <Loading />}
          {appts.isError && <LoadError message="Failed to load appointments" onRetry={() => void appts.refetch()} />}
          {setStatus.isError && <Alert severity="error">{setStatus.error instanceof Error ? setStatus.error.message : 'Status update failed'}</Alert>}
          {appts.data && appts.data.data.length === 0 && !appts.isLoading && !appts.isError && <Empty />}
          {appts.data?.data.map((a) => (
            <Card key={a.id}>
              <CardContent>
                <Typography variant="h6">{a.doctor?.name} · {formatIST(a.startsAt)} IST</Typography>
                <Typography variant="body2" color="text.secondary">Status: {a.status}{a.reason ? ` · ${a.reason}` : ''}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {(['CONFIRMED', 'COMPLETED', 'NO_SHOW'] as const).map((s) => (
                    <Button key={s} size="small" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: a.id, status: s })} aria-label={`Mark appointment ${s}`}>{s}</Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      {tab === 1 && (
        <Box>
          {affs.isLoading && <Loading />}
          {affs.isError && <LoadError message="Failed to load availability" onRetry={() => void affs.refetch()} />}
          {(affs.data ?? []).map((a) => (
            <Typography key={a.id} variant="body2">
              {a.hospital.name}: {a.schedulePending ? 'schedule pending' : a.availabilityRules.map((r) => `${DAYS[r.dayOfWeek]} ${r.startTime}-${r.endTime}`).join(', ')}
            </Typography>
          ))}
          <Stack spacing={1} sx={{ mt: 2, maxWidth: 560 }}>
            <TextField select label={t('doctors.hospital')} value={editHosp} onChange={(e) => loadHospRules(e.target.value)}>
              {(affs.data ?? []).map((a) => <MenuItem key={a.hospitalId} value={a.hospitalId}>{a.hospital.name}</MenuItem>)}
            </TextField>
            {editRules.map((r, i) => (
              <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'center' }}>
                <Typography sx={{ minWidth: 120 }}>{DAYS[r.dayOfWeek]} {r.startTime}-{r.endTime} · {r.slotMinutes}m</Typography>
                <Button size="small" color="error" onClick={() => setEditRules((x) => x.filter((_, j) => j !== i))}>{t('common.delete')}</Button>
              </Stack>
            ))}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField select label="Day" value={ruleDraft.dayOfWeek} onChange={(e) => setRuleDraft({ ...ruleDraft, dayOfWeek: Number(e.target.value) })} sx={{ minWidth: 110 }}>
                {DAYS.map((d, i) => <MenuItem key={d} value={i}>{d}</MenuItem>)}
              </TextField>
              <TextField label="Start (HH:mm)" value={ruleDraft.startTime} onChange={(e) => setRuleDraft({ ...ruleDraft, startTime: e.target.value })} placeholder="10:00" />
              <TextField label="End (HH:mm)" value={ruleDraft.endTime} onChange={(e) => setRuleDraft({ ...ruleDraft, endTime: e.target.value })} placeholder="16:00" />
              <TextField label="Slot (min)" type="number" value={ruleDraft.slotMinutes} onChange={(e) => setRuleDraft({ ...ruleDraft, slotMinutes: Number(e.target.value) })} sx={{ maxWidth: 130 }} />
              <Button variant="outlined" onClick={addRule}>Add rule</Button>
            </Stack>
            <Button variant="contained" disabled={!editHosp || saving} onClick={() => void saveAvail()}>{saving ? t('common.loading') : t('common.save')}</Button>
          </Stack>
        </Box>
      )}
      {tab === 2 && (
        <Box>
          {timeOff.isLoading && <Loading />}
          {timeOff.isError && <LoadError message="Failed to load time-off" onRetry={() => void timeOff.refetch()} />}
          {(timeOff.data ?? []).map((o) => (
            <Typography key={o.id} variant="body2">{formatIST(o.startsAt)} → {formatIST(o.endsAt)}{o.reason ? ` (${o.reason})` : ''}</Typography>
          ))}
          {(!timeOff.data || timeOff.data.length === 0) && !timeOff.isLoading && !timeOff.isError && <Empty />}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <TextField label="From" type="datetime-local" value={offStart} onChange={(e) => setOffStart(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="To" type="datetime-local" value={offEnd} onChange={(e) => setOffEnd(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Reason (optional)" value={offReason} onChange={(e) => setOffReason(e.target.value)} fullWidth />
            <Button variant="contained" onClick={() => void addOff()}>Add</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
