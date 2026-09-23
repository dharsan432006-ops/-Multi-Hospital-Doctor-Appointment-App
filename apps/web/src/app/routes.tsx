import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { Loading } from '../components/States.js';
import { ErrorBoundary } from '../components/ErrorBoundary.js';
import { Home } from '../pages/Home.js';

function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      // If a dynamically imported module failed (e.g. stale Vite cache or chunk hash update)
      if (err?.message?.includes('dynamically imported module') || err?.name === 'TypeError') {
        const hasReloaded = sessionStorage.getItem('vite_chunk_reloaded');
        if (!hasReloaded) {
          sessionStorage.setItem('vite_chunk_reloaded', 'true');
          window.location.reload();
        }
      }
      throw err;
    }
  });
}

const HospitalList = safeLazy(() => import('../pages/HospitalList.js').then((m) => ({ default: m.HospitalList })));
const HospitalDetail = safeLazy(() => import('../pages/HospitalDetail.js').then((m) => ({ default: m.HospitalDetail })));
const DoctorList = safeLazy(() => import('../pages/DoctorList.js').then((m) => ({ default: m.DoctorList })));
const DoctorProfile = safeLazy(() => import('../pages/DoctorProfile.js').then((m) => ({ default: m.DoctorProfile })));
const BookingConfirm = safeLazy(() => import('../pages/BookingConfirm.js').then((m) => ({ default: m.BookingConfirm })));
const Login = safeLazy(() => import('../pages/Login.js').then((m) => ({ default: m.Login })));
const Register = safeLazy(() => import('../pages/Register.js').then((m) => ({ default: m.Register })));
const MyBookings = safeLazy(() => import('../pages/MyBookings.js').then((m) => ({ default: m.MyBookings })));
const MedicalRecords = safeLazy(() => import('../pages/MedicalRecords.js').then((m) => ({ default: m.MedicalRecords })));
const Profile = safeLazy(() => import('../pages/Profile.js').then((m) => ({ default: m.Profile })));
const DoctorPortal = safeLazy(() => import('../pages/DoctorPortal.js').then((m) => ({ default: m.DoctorPortal })));
const AdminDashboard = safeLazy(() => import('../pages/AdminDashboard.js').then((m) => ({ default: m.AdminDashboard })));
const Blog = safeLazy(() => import('../pages/Blog.js').then((m) => ({ default: m.Blog })));
const Contact = safeLazy(() => import('../pages/Contact.js').then((m) => ({ default: m.Contact })));
const NotFound = safeLazy(() => import('../pages/NotFound.js').then((m) => ({ default: m.NotFound })));

function RequireAuth({ roles, children }: { roles?: string[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Forbidden() {
  return <Navigate to="/" replace />;
}

export function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hospitals" element={<HospitalList />} />
          <Route path="/hospitals/map" element={<HospitalList />} />
          <Route path="/hospitals/:id" element={<HospitalDetail />} />
          <Route path="/doctors" element={<DoctorList />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/book/confirm" element={<RequireAuth roles={['PATIENT']}><BookingConfirm /></RequireAuth>} />
          <Route path="/bookings" element={<RequireAuth roles={['PATIENT']}><MyBookings /></RequireAuth>} />
          <Route path="/medical-records" element={<RequireAuth roles={['PATIENT']}><MedicalRecords /></RequireAuth>} />
          <Route path="/records" element={<RequireAuth roles={['PATIENT']}><MedicalRecords /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth roles={['PATIENT', 'DOCTOR', 'ADMIN']}><Profile /></RequireAuth>} />
          <Route path="/doctor" element={<RequireAuth roles={['DOCTOR']}><DoctorPortal /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth roles={['ADMIN']}><AdminDashboard /></RequireAuth>} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
