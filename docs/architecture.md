# Architecture

Time zone: **Asia/Kolkata (IST)** for display + slot generation; **UTC** in storage (`startsAt/endsAt`).

```
Browser (React 18 + Vite + MUI, IST slot display)
  │  https (CloudFront) / http://localhost:5173
  ▼
Nginx (SPA fallback, gzip, security headers, /health)
  │  /api
  ▼
Express API (Node 20, Zod, Helmet, CORS allow-list, rate-limit, request-id + Pino, no PHI in logs)
  ├── Auth: argon2id, JWT access 15m + rotating refresh (httpOnly cookie, reuse detection revokes chain), RBAC + object checks
  ├── Slots: AvailabilityRule (dayOfWeek/start/end/slotMinutes) × 30d window minus TimeOff minus booked → IST grouping
  ├── Booking: serializable txn + partial unique index (doctorId,startsAt) WHERE status IN (PENDING,CONFIRMED)
  │            + cross-hospital overlap guard + Idempotency-Key header
  ├── Notifications: provider-agnostic service (console/SendGrid/Twilio), BullMQ + Redis with inline fallback, 24h/2h reminders
  ├── AI: OpenRouter server-pinned model, 503 when OPENROUTER_API_KEY missing, input capped at AI_MAX_INPUT_CHARS
  ├── Privacy: AES-256-GCM medicalNotesEnc (key rotation via PREV_ENCRYPTION_KEY), ConsentRecord gate, append-only AuditLog
  └── Docs: OpenAPI 3.0 (docs/openapi.yaml) at /api/docs + /api/openapi.yaml
  │  postgres:16 (RDS encrypted Multi-AZ in prod)   │  redis:7 (ElastiCache in prod)
  ▼                                                  ▼
PostgreSQL (Prisma)                              Redis (BullMQ)
```

## Request lifecycle (booking)

1. `GET /api/doctors/:id/availability?hospitalId&from&to` → slot engine expands weekly rules in IST, removes `TimeOff` overlaps and booked ranges.
2. `POST /api/appointments` with `Idempotency-Key` → Zod validate → consent check (`MEDICAL_CARE`) → serializable txn:
   unique-violation on partial index ⇒ `409 SLOT_TAKEN`; cross-hospital overlap ⇒ `409 DOCTOR_OVERLAP`.
3. Enqueue confirmation + reminders (BullMQ; inline fallback when Redis down). `NotificationLog` rows track each send.
4. Doctor/admin status transitions (`confirm/complete/no-show`) notify the patient; patient cancel/reschedule obeys `CANCELLATION_CUTOFF_HOURS` (default 2h).

## Data model (essentials)

- `User/RefreshToken`, `Hospital(slug unique, dataVerified)`, `Department(hospitalId+name unique)`,
  `Doctor(isDemo/isVerified)`, `DoctorAffiliation(doctor+hospital unique, schedulePending)`,
  `AvailabilityRule`, `TimeOff`, `Patient(medicalNotesEnc)`, `Appointment(idempotencyKey unique + partial no-double-booking index)`,
  `ConsentRecord`, `AuditLog` (append-only), `NotificationLog`.

## Deployment topology

- **Local:** `docker compose up --build` → postgres, redis, api (:4000, migrates on boot), web (:5173).
- **Cloud (Terraform):** VPC (public ALB + private ECS/RDS/Redis), ALB → Fargate API, S3+CloudFront web, RDS PG16 encrypted Multi-AZ + ElastiCache Redis 7, Secrets Manager, CloudWatch alarms → SNS.
- **On-prem:** same containers on VMware/K8s via Helm chart (`infra/helm`), Jenkinsfile pipeline, local Postgres/Redis, backups on-site (see `on-prem.md`).

## Observability

- `/health` (liveness) + `/api/health` (DB+Redis checks, 503 when degraded). Structured Pino logs with redacted auth/PHI.
- Opt-in `observability` compose profile: Prometheus + Grafana (`infra/monitoring`). Cloud: Container Insights + CloudWatch alarms.
- Next step for full RED metrics: add `prom-client` `/metrics` (counters `appointments_created_total`, histogram `http_request_duration_seconds`) and point Prometheus at it.
