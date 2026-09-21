import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { getConfig } from './config/config.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.routes.js';
import hospitalRoutes from './routes/hospitals.routes.js';
import departmentRoutes from './routes/departments.routes.js';
import doctorRoutes from './routes/doctors.routes.js';
import patientRoutes from './routes/patients.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import consentRoutes from './routes/consents.routes.js';
import adminRoutes from './routes/admin.routes.js';
import healthRoutes from './routes/health.routes.js';
import aiRoutes from './routes/ai.routes.js';

function loadOpenApi(): Record<string, unknown> {
  const candidates = [
    path.join(process.cwd(), 'docs', 'openapi.yaml'),
    path.join(process.cwd(), '..', '..', 'docs', 'openapi.yaml'),
    path.join(__dirname, '..', '..', '..', 'docs', 'openapi.yaml'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return YAML.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
    } catch {
      // try next
    }
  }
  return {
    openapi: '3.0.0',
    info: { title: 'Bangalore Hospital Appointment API', version: '1.0.0' },
    paths: {},
  };
}

export function createApp() {
  const cfg = getConfig();
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: cfg.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      redact: {
        paths: ['req.body.password', 'req.body.email', 'req.body.phone', 'req.headers.authorization'],
        remove: true,
      },
    })
  );
  app.use(generalLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.use('/api/health', healthRoutes);

  const spec = loadOpenApi();
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api/openapi.yaml', (_req, res) => {
    res.type('text/yaml').send(YAML.stringify(spec));
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/hospitals', hospitalRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/consents', consentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
