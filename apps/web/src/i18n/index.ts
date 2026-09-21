import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  appName: 'Bangalore Hospital Appointments',
  nav: { home: 'Home', hospitals: 'Hospitals', doctors: 'Doctors', bookings: 'My Bookings', doctorPortal: 'Doctor Portal', admin: 'Admin', profile: 'Profile', login: 'Login', register: 'Register', logout: 'Logout' },
  common: { search: 'Search', loading: 'Loading…', retry: 'Retry', noResults: 'No results found.', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', view: 'View', book: 'Book', close: 'Close', language: 'Language' },
  badges: { unverified: 'Details pending verification', demoData: 'Demo data', emergency: '24×7 Emergency', noEmergency: 'No emergency' },
  hospitals: { title: 'Hospitals', searchPh: 'Search by name…', accreditation: 'Accreditation', emergencyOnly: 'Emergency only', type: 'Type', all: 'All', departments: 'Departments', contact: 'Contact', website: 'Website', beds: 'Beds' },
  doctors: { title: 'Doctors', specialty: 'Specialty', hospital: 'Hospital', department: 'Department', language: 'Language', keywords: 'Name or keyword', languages: 'Languages', qualifications: 'Qualifications', hospitalsAff: 'Hospitals', availability: 'Availability', noSlots: 'No bookable slots in the next 30 days.' },
  booking: { title: 'Confirm booking', reason: 'Reason for visit (optional)', confirm: 'Confirm booking', confirmed: 'Appointment confirmed!', cancelTitle: 'Cancel appointment?', cancelOk: 'Yes, cancel', reschedule: 'Reschedule', cancelled: 'Appointment cancelled', cutoffNote: 'Free cancellation up to 2 hours before the visit.' },
  auth: { email: 'Email', password: 'Password', name: 'Full name', phone: 'Phone', loginTitle: 'Login', registerTitle: 'Create account', needConsent: 'You must accept Medical Care consent to register.' },
  consents: { title: 'Privacy consents', medical: 'Medical care', comms: 'Appointment communications', insurance: 'Insurance', research: 'Research', withdraw: 'Withdraw', grant: 'Grant', blocked: 'Booking is blocked without Medical Care consent.' },
  ai: { title: 'Need help choosing?', symptomsPh: 'Describe your symptoms…', ask: 'Suggest specialty', bookingPh: 'e.g. Kannada-speaking cardiologist near Apollo…', disclaimer: 'General information only, not a diagnosis.' },
  admin: { title: 'Admin dashboard', reports: 'Reports', users: 'Users', audit: 'Audit log', total: 'Total bookings', byDay: 'Bookings by day', byHospital: 'By hospital', bySpecialty: 'By specialty', exportCsv: 'Export CSV', role: 'Role', setRole: 'Set role' },
  doctor: { title: 'Doctor portal', myAppointments: 'My appointments', availability: 'Availability editor', timeOff: 'Time off', mark: 'Mark', confirm: 'Confirm', complete: 'Complete', noShow: 'No-show' },
};

// Scaffolding for Kannada (kn) and Hindi (hi): keys stubbed, values fall back to English at runtime.
const kn: Record<string, string> = {};
const hi: Record<string, string> = {};

function flatten(obj: Record<string, unknown>, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else flatten(v as Record<string, unknown>, key, out);
  }
  return out;
}

const enFlat = flatten(en);

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: enFlat },
    kn: { translation: { ...enFlat, ...flatten(kn) } },
    hi: { translation: { ...enFlat, ...flatten(hi) } },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ (scaffold)' },
  { code: 'hi', label: 'हिन्दी (scaffold)' },
];
