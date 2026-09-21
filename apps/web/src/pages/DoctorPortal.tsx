import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch, apiFetchPage, formatIST } from '../api/client.js';
import { Empty, Loading } from '../components/States.js';
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctorAppts'] }); },
  });

  const [editHosp, setEditHosp] = useState('');
  const [editRules, setEditRules] = useState('');
  const saveAvail = async () => {
    try {
      const rules = JSON.parse(editRules || '[]') as AffRule[];
      await apiFetch('/doctors/me/availability', { method: 'PUT', body: JSON.stringify({ hospitalId: editHosp, rules }) });
      setMsg('Availability saved');
      qc.invalidateQueries({ queryKey: ['myAff'] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed (rules JSON: [{"dayOfWeek":1,"startTime":"10:00","endTime":"16:00","slotMinutes":20}])');
    }
  };

  const [offStart, setOffStart] = useState('');
  const [offEnd, setOffEnd] = useState('');
  const addOff = async () => {
    try {
      await apiFetch('/doctors/me/time-off', { method: 'POST', body: JSON.stringify({ startsAt: offStart, endsAt: offEnd }) });
      setMsg('Time-off added');
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
          {appts.data && appts.data.data.length === 0 && <Empty />}
          {appts.data?.data.map((a) => (
            <Card key={a.id}>
              <CardContent>
                <Typography variant="h6">{a.doctor?.name} · {formatIST(a.startsAt)} IST</Typography>
                <Typography variant="body2" color="text.secondary">Status: {a.status}{a.reason ? ` · ${a.reason}` : ''}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {(['CONFIRMED', 'COMPLETED', 'NO_SHOW'] as const).map((s) => (
                    <Button key={s} size="small" onClick={() => setStatus.mutate({ id: a.id, status: s })}>{s}</Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      {tab === 1 && (
        <Box>
          {(affs.data ?? []).map((a) => (
            <Typography key={a.id} variant="body2">
              {a.hospital.name}: {a.schedulePending ? 'schedule pending' : a.availabilityRules.map((r) => `${DAYS[r.dayOfWeek]} ${r.startTime}-${r.endTime}`).join(', ')}
            </Typography>
          ))}
          <Stack spacing={1} sx={{ mt: 2, maxWidth: 560 }}>
            <TextField select label={t('doctors.hospital')} value={editHosp} onChange={(e) => {
              setEditHosp(e.target.value);
              const found = (affs.data ?? []).find((x) => x.hospitalId === e.target.value);
              setEditRules(JSON.stringify(found?.availabilityRules ?? [], null, 1));
            }}>
              {(affs.data ?? []).map((a) => <MenuItem key={a.hospitalId} value={a.hospitalId}>{a.hospital.name}</MenuItem>)}
            </TextField>
            <TextField label="Rules (JSON array)" value={editRules} onChange={(e) => setEditRules(e.target.value)} multiline minRows={4} fullWidth />
            <Button variant="contained" disabled={!editHosp} onClick={() => void saveAvail()}>{t('common.save')}</Button>
          </Stack>
        </Box>
      )}
      {tab === 2 && (
        <Box>
          {(timeOff.data ?? []).map((o) => (
            <Typography key={o.id} variant="body2">{formatIST(o.startsAt)} → {formatIST(o.endsAt)}{o.reason ? ` (${o.reason})` : ''}</Typography>
          ))}
          {(!timeOff.data || timeOff.data.length === 0) && <Empty />}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <TextField label="From (ISO)" value={offStart} onChange={(e) => setOffStart(e.target.value)} placeholder="2026-10-01T04:30:00Z" fullWidth />
            <TextField label="To (ISO)" value={offEnd} onChange={(e) => setOffEnd(e.target.value)} placeholder="2026-10-01T10:30:00Z" fullWidth />
            <Button variant="contained" onClick={() => void addOff()}>Add</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
