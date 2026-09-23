import { Box, Card, CardContent, Container, Typography, Chip, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function Blog() {
  const posts = [
    {
      id: 1,
      title: 'Preventive Cardiology: 5 Signs You Shouldn’t Ignore',
      category: 'Cardiology',
      date: 'Sept 20, 2026',
      readTime: '4 min read',
      excerpt: 'Understanding subtle hypertension indicators, cholesterol management, and when to book an ECG review with a certified cardiologist.',
      doctor: 'Dr. Priya Kapoor',
    },
    {
      id: 2,
      title: 'Childhood Immunization & Growth Milestones',
      category: 'Pediatrics',
      date: 'Sept 14, 2026',
      readTime: '5 min read',
      excerpt: 'A comprehensive guide for parents on vaccination schedules, nutritional benchmarks, and regular pediatric consultations in Bangalore.',
      doctor: 'Dr. Rajesh Deshmukh',
    },
    {
      id: 3,
      title: 'How 24-Hour Automated Reminders Prevent Missed Medical Visits',
      category: 'Telehealth & Tech',
      date: 'Sept 10, 2026',
      readTime: '3 min read',
      excerpt: 'Discover how automated SMS & email reminders improve healthcare continuity, patient compliance, and hospital clinic management.',
      doctor: 'Doctify Clinical Team',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="overline" sx={{ color: '#4f46e5', fontWeight: 800 }}>
          Health Insights & Articles
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
          Doctify Healthcare Blog
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Evidence-based articles, patient wellness guides, and updates from leading medical specialists across Bangalore.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {posts.map((p) => (
          <Card key={p.id} sx={{ borderRadius: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Chip label={p.category} size="small" color="primary" sx={{ fontWeight: 700, fontSize: 11 }} />
                <Typography variant="caption" color="text.secondary">
                  {p.readTime}
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5, lineHeight: 1.3 }}>
                {p.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                {p.excerpt}
              </Typography>
              <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 700, display: 'block' }}>
                By {p.doctor} · {p.date}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ mt: 6, p: 4, borderRadius: 4, bgcolor: '#ede9fe', textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e1b4b', mb: 1 }}>
          Looking for a Specialist Consultation?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Schedule with verified doctors at top Bangalore hospitals with live slot booking.
        </Typography>
        <Button component={RouterLink} to="/doctors" variant="contained" sx={{ bgcolor: '#4f46e5', borderRadius: 9999 }}>
          Browse Certified Doctors ➔
        </Button>
      </Box>
    </Container>
  );
}
