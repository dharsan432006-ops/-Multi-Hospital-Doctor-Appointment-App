# Bangalore Multi-Hospital Doctor Appointment App

Production-grade appointment platform for a 10-hospital network in Bangalore, India.
Patients browse hospitals/doctors, see real-time availability (IST), and book.
Doctors manage schedules. Admins manage network + reports.

> Built from `doc master prompt.md`. Time zone: **Asia/Kolkata (IST)** display, UTC storage.

## Quick start (Phase 1)

```powershell
# 1. env
Copy-Item .env.example .env
Copy-Item .env apps/api/.env
# edit apps/api/.env + .env passwords if needed

# 2. infra
docker compose up -d postgres redis

# 3. backend deps + db
npm install --workspace=apps/api
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma
npm run seed --workspace=apps/api

# 4. run api (minimal Phase-1 server)
npm run dev --workspace=apps/api
# health: http://localhost:4000/health
```

Single-command run (after Phase 4 Dockerfiles are final):

```powershell
docker compose up --build
```

## Repo structure

```
/apps/web            React frontend (Phase 3)
  src/main.tsx       Phase-1 placeholder
/apps/api            Express backend (Phase 2)
  src/index.ts       Phase-1 minimal health server
  prisma/
    schema.prisma    Full data model (Section 4)
    migrations/      0001 init + partial unique index for no-double-booking
    seed.ts          Idempotent seed (Section 3 rules)
/seed                hospitals.json, doctors.json, hospitals.csv, doctors.csv
/infra/terraform     (Phase 4)
/docs                openapi.yaml, architecture.md, compliance.md, on-prem.md (Phase 4)
/.github/workflows   ci.yml, deploy.yml (Phase 4)
docker-compose.yml   postgres:16 + redis:7 + api + web
.env.example         All required env (no secrets committed)
```

## Seed data (Section 3, verified)

- **10 hospitals**: 3 canonical (Apollo Bannerghatta, Fortis Cunningham, HCG) with
  real address/lat-lon/contact/website + `dataVerified=true`, enriched with
  type/emergency/beds/keySpecialties from the comparison table.
- **7 table-only hospitals** (Fortis Bannerghatta, Aster RV, BGS Gleneagles,
  Rainbow Children's, Hosmat Bangalore, Narayana JnanaBhumi, NIMHANS) with
  `address/latitude/longitude/contact/website = null`, `dataVerified=false`.
  Admin UI must show "details pending verification".
  - Narayana: `beds=null`, `bedsNote` explains 710 vs ~1500 inconsistency.
  - NIMHANS: `type=GOVERNMENT`, `beds=420`.
- **3 doctors** (demo, `isDemo=true`, `isVerified=false`, avatar fallback required):
  - Priya Kapoor (Cardiology, Apollo, Mon–Fri 10:00–16:00 IST)
  - Rajesh Malhotra (Oncology, Apollo Tue–Sat 11:00–17:00 + HCG affiliation
    `schedulePending=true` with no rules — respects no-overlap rule)
  - Anita Desai (Orthopedics, Hosmat Bangalore, Mon–Fri 09:00–15:00 IST)
  - Logins use `@example.test` (never real contact emails).
- **Users**: `admin@example.test` + 3 doctor `@example.test` + 3 patient
  `@example.test`. Passwords from `SEED_*_PASSWORD` env only.
- **~30 appointments** across past/future dates (CONFIRMED/COMPLETED/CANCELLED/NO_SHOW).
- Idempotent: hospitals upsert by `slug`, departments by `(hospitalId,name)`,
  affiliations by `(doctorId,hospitalId)`, rules replaced per affiliation.

Verify:

```powershell
npx prisma studio
# hospitals count = 10, doctors = 3, users = 7, appointments ~= 30
```

## Data model highlights

- `Hospital.slug` unique; `Department @@unique(hospitalId,name)`;
  `DoctorAffiliation @@unique(doctorId,hospitalId)`.
- `Appointment.idempotencyKey @unique`; partial unique index
  `Appointment(doctorId,startsAt) WHERE status IN ('PENDING','CONFIRMED')`
  in `*_no_double_booking/migration.sql` + serializable transaction +
  cross-hospital overlap check in Phase-2 booking service.
- `Patient.medicalNotesEnc` AES-256-GCM (Phase 2), `ConsentRecord`,
  append-only `AuditLog`, `NotificationLog`.

## Phases

- [x] **Phase 1 — Foundation**: structure, compose, env,
  Prisma schema + migrations, seed JSON/CSV + `seed.ts`.
- [x] **Phase 2 — Backend** (done, 10/10 tests green):
  config (Zod-validated), JWT access (15m) + rotating refresh (httpOnly cookie,
  reuse detection), RBAC + object-level checks, hospitals/departments/doctors/
  patients/appointments/consents/admin routes, IST slot engine + serializable
  booking (partial unique index + cross-hospital overlap guard + idempotency),
  notifications (console/SendGrid/Twilio stubs, BullMQ + inline fallback,
  24h/2h reminders), **OpenRouter AI** (`/api/ai/status|symptom-guide|booking-help`,
  server-pinned model, 503 when `OPENROUTER_API_KEY` missing),
  OpenAPI 3.0 at `docs/openapi.yaml` served via Swagger UI at `/api/docs`,
  Vitest unit + integration (double-booking race, cross-hospital, RBAC).
- [x] **Phase 3 — Frontend** (done, 4/4 tests green, `vite build` clean):
  React 18 + TS + Vite, MUI theme, React Router + role guards, TanStack Query,
  RHF + Zod forms, IST slot display, i18n scaffold (en complete, kn/hi stubbed).
  Pages: Home (search + OpenRouter symptom helper), Hospitals (+detail, OSM map
  links, pending-verification badges), Doctors (+profile, SlotPicker grouped by
  IST day, avatar fallback, Demo badges), Booking confirm (idempotent),
  Login/Register (4 purpose checkboxes, MEDICAL_CARE required), My Bookings
  (cancel w/ cutoff messaging, reschedule dialog), Profile (consent toggles),
  Doctor portal (appointments + status, availability editor, time-off),
  Admin (hospital verify toggles, Demo badges, recharts reports + CSV export,
  role management, audit viewer).
- [x] **Phase 4 — DevOps & docs** (done):
  Final Dockerfiles (root-context, non-root API, entrypoint migrations,
  baked OpenAPI, healthchecks; nginx SPA + gzip + CSP), `docker compose up --build`
  (postgres + redis + api + web, opt-in `observability` profile with Prometheus +
  Grafana), GH Actions `ci.yml` (lint/typecheck/tests/coverage/audit/docker/E2E smoke)
  + `deploy.yml` (GHCR → staging migrate → ECS → smoke → manual approval → prod),
  Terraform `ap-south-1` (VPC, RDS PG16 encrypted Multi-AZ, ElastiCache Redis 7,
  ECS Fargate + ALB, S3 + CloudFront, Secrets Manager, CloudWatch alarms),
  Helm chart (`infra/helm`), monitoring (`infra/monitoring`), docs
  (`architecture.md`, `compliance.md`, `on-prem.md`), `Jenkinsfile`,
  Playwright E2E (patient book+cancel, doctor availability, admin add hospital).

## Run it (Phase 4)

```powershell
# All-in-one (builds api + web, migrates on API boot)
Copy-Item .env.example .env
docker compose up -d --build
docker compose exec api npx prisma migrate deploy --schema=./prisma/schema.prisma
npm run seed --workspace=apps/api
# web: http://localhost:5173 · api: http://localhost:4000/health · docs: http://localhost:4000/api/docs
```

```powershell
# Observability opt-in
docker compose --profile observability up -d prometheus grafana
# Prometheus: http://localhost:9090 · Grafana: http://localhost:3000
```

```powershell
# E2E (needs the stack + seed above)
npm install
npx playwright install --with-deps chromium
npm run test:e2e
```

Cloud deploy: see `infra/terraform/README.md` + `.github/workflows/deploy.yml`
(secrets: `STAGING/PROD_DATABASE_URL`, `STAGING/PROD_API_URL`, AWS keys,
`PROD_API_URL` for the web build arg). On-prem: see `docs/on-prem.md` +
`Jenkinsfile` + `helm upgrade --install appointments ./infra/helm/hospital-appointments`.

## Compliance notes (DPDPA 2023, summary — full doc in Phase 4)

- Purpose-specific consent (`MEDICAL_CARE` required for booking), withdrawable.
- AES-256-GCM for health fields, TLS + RDS encryption, India residency
  (ap-south-1), 7-year retention, append-only audit, no PHI in logs.

## Phase 1 checklist

- [x] `docker compose up -d postgres redis` healthy
- [x] `prisma validate` passes; migrations apply clean
- [x] `npm run seed` loads 10 hospitals + 3 doctors per Section 3
  (unverified fields `null`, not invented)
- [x] 1 admin + 3 doctor + 3 patient demo users, ~30 appointments
- [x] `tsc --noEmit` clean (api)
- [x] Phase 2 backend, Phase 3 frontend, Phase 4 DevOps/docs

## Phase 4 checklist

- [x] `docker compose up --build` starts web, api, Postgres, Redis (api migrates on boot, healthchecks green)
- [x] `ci.yml` green: lint, typecheck, backend + frontend tests, audit, Docker builds, E2E smoke
- [x] `deploy.yml`: GHCR build/push → staging migrate + ECS → smoke → manual approval → prod
- [x] Terraform `ap-south-1`: VPC, RDS PG16 (encrypted/Multi-AZ/snapshots), ElastiCache Redis 7, ECS + ALB, S3 + CloudFront, Secrets Manager, CloudWatch alarms
- [x] Helm chart + `Jenkinsfile` for on-prem; `docs/on-prem.md` keeps all data in India
- [x] Monitoring: compose `observability` profile (Prometheus + Grafana + dashboard + alerts)
- [x] Docs: `architecture.md`, `compliance.md`, `on-prem.md`; OpenAPI at `/api/docs`
- [x] Playwright E2E: patient books + cancels, doctor sets availability, admin adds hospital
