import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchPage, newIdempotencyKey } from './client.js';
import type { Appointment, Consent, Doctor, Hospital, PatientMedicalProfile, Slot } from './types.js';

export function useHospitals(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  return useQuery({ queryKey: ['hospitals', qs.toString()], queryFn: () => apiFetchPage<Hospital>(`/hospitals?${qs}`) });
}

export function useHospital(id: string | undefined) {
  return useQuery({ queryKey: ['hospital', id], queryFn: () => apiFetch<Hospital>(`/hospitals/${id}`), enabled: !!id });
}

export function useDoctors(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  return useQuery({ queryKey: ['doctors', qs.toString()], queryFn: () => apiFetchPage<Doctor>(`/doctors?${qs}`) });
}

export function useDoctor(id: string | undefined) {
  return useQuery({ queryKey: ['doctor', id], queryFn: () => apiFetch<Doctor>(`/doctors/${id}`), enabled: !!id });
}

export function useAvailability(doctorId: string | undefined, hospitalId: string | undefined) {
  return useQuery({
    queryKey: ['availability', doctorId, hospitalId],
    queryFn: () => apiFetch<Slot[]>(`/doctors/${doctorId}/availability${hospitalId ? `?hospitalId=${hospitalId}` : ''}`),
    enabled: !!doctorId,
  });
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { doctorId: string; hospitalId?: string; affiliationId?: string; startsAt: string; reason?: string }) =>
      apiFetch<Appointment>('/appointments', {
        method: 'POST',
        headers: { 'Idempotency-Key': newIdempotencyKey() },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability'] });
      qc.invalidateQueries({ queryKey: ['myBookings'] });
    },
  });
}

export function useMyBookings() {
  return useQuery({ queryKey: ['myBookings'], queryFn: () => apiFetchPage<Appointment>('/appointments?pageSize=50') });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Appointment>(`/appointments/${id}/cancel`, { method: 'PATCH', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myBookings'] }),
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; startsAt: string }) =>
      apiFetch<Appointment>(`/appointments/${v.id}/reschedule`, { method: 'PATCH', body: JSON.stringify({ startsAt: v.startsAt }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myBookings'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useConsents() {
  return useQuery({ queryKey: ['consents'], queryFn: () => apiFetch<Consent[]>('/consents') });
}

export function useSetConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { purpose: string; withdraw: boolean }) =>
      v.withdraw
        ? apiFetch(`/consents/${v.purpose}`, { method: 'DELETE' })
        : apiFetch('/consents', { method: 'POST', body: JSON.stringify({ purpose: v.purpose }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }),
  });
}

export function useMedicalRecords() {
  return useQuery({
    queryKey: ['medicalRecords'],
    queryFn: () => apiFetch<PatientMedicalProfile>('/patient/medical-records'),
  });
}

export function useAddAllergy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allergy: any) =>
      apiFetch('/patient/allergies', {
        method: 'POST',
        body: JSON.stringify(allergy),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicalRecords'] }),
  });
}

export function useAddVaccination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vac: any) =>
      apiFetch('/patient/vaccinations', {
        method: 'POST',
        body: JSON.stringify(vac),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicalRecords'] }),
  });
}
