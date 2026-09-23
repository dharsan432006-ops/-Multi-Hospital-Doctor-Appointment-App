import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { Loading } from '../components/States.js';
import { Home } from '../pages/Home.js';

const HospitalList = lazy(() => import('../pages/HospitalList.js').then((m) => ({ default: m.HospitalList })));
const HospitalDetail = lazy(() => import('../pages/HospitalDetail.js').then((m) => ({ default: m.HospitalDetail })));
const DoctorList = lazy(() => import('../pages/DoctorList.js').then((m) => ({ default: m.DoctorList })));
const DoctorProfile = lazy(() => import('../pages/DoctorProfile.js').then((m) => ({ default: m.DoctorProfile })));
const BookingConfirm = lazy(() => import('../pages/BookingConfirm.js').then((m) => ({ default: m.BookingConfirm })));
const Login = lazy(() => import('../pages/Login.js').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('../pages/Register.js').then((m) => ({ default: m.Register })));
const MyBookings = lazy(() => import('../pages/MyBookings.js').then((m) => ({ default: m.MyBookings })));
const MedicalRecords = lazy(() => import('../pages/MedicalRecords.js').then((m) => ({ default: m.MedicalRecords })));
const Profile = lazy(() => import('../pages/Profile.js').then((m) => ({ default: m.Profile })));
const DoctorPortal = lazy(() => import('../pages/DoctorPortal.js').then((m) => ({ default: m.DoctorPortal })));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard.js').then((m) => ({ default: m.AdminDashboard })));
const Blog = lazy(() => import('../pages/Blog.js').then((m) => ({ default: m.Blog })));
const Contact = lazy(() => import('../pages/Contact.js').then((m) => ({ default: m.Contact })));
const NotFound = lazy(() => import('../pages/NotFound.js').then((m) => ({ default: m.NotFound })));

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
  );
}
