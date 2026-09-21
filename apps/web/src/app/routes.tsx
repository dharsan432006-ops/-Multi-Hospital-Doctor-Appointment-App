import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { Loading } from '../components/States.js';
import { Home } from '../pages/Home.js';
import { HospitalList } from '../pages/HospitalList.js';
import { HospitalDetail } from '../pages/HospitalDetail.js';
import { DoctorList } from '../pages/DoctorList.js';
import { DoctorProfile } from '../pages/DoctorProfile.js';
import { BookingConfirm } from '../pages/BookingConfirm.js';
import { Login } from '../pages/Login.js';
import { Register } from '../pages/Register.js';
import { MyBookings } from '../pages/MyBookings.js';
import { Profile } from '../pages/Profile.js';
import { DoctorPortal } from '../pages/DoctorPortal.js';
import { AdminDashboard } from '../pages/AdminDashboard.js';
import { NotFound } from '../pages/NotFound.js';

function RequireAuth({ roles, children }: { roles?: string[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/hospitals" element={<HospitalList />} />
      <Route path="/hospitals/:id" element={<HospitalDetail />} />
      <Route path="/doctors" element={<DoctorList />} />
      <Route path="/doctors/:id" element={<DoctorProfile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/book/confirm" element={<RequireAuth roles={['PATIENT']}><BookingConfirm /></RequireAuth>} />
      <Route path="/bookings" element={<RequireAuth roles={['PATIENT']}><MyBookings /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth roles={['PATIENT', 'DOCTOR', 'ADMIN']}><Profile /></RequireAuth>} />
      <Route path="/doctor" element={<RequireAuth roles={['DOCTOR']}><DoctorPortal /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth roles={['ADMIN']}><AdminDashboard /></RequireAuth>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
