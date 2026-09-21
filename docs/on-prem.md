# On-prem deployment — Bangalore data centre

All data stays on-site in India. Same containers as cloud, orchestrated by on-prem Kubernetes (or VMware + Docker Compose as a fallback).

## 0. Prerequisites (on-prem)

- VMware vSphere / bare-metal K8s (≥ 3 nodes), redundant power + dual ISP, NTP synced to IST.
- Private container registry (Harbor) mirroring `hospital-api` / `hospital-web` images.
- PostgreSQL 16 + Redis 7 (HA pair), daily `pg_basebackup`/WAL + Redis RDB snapshots to on-site NAS, monthly restore drill.
- Secrets in Vault (or K8s Sealed Secrets). Keys: `DATABASE_URL`, `JWT_ACCESS_SECRET` (≥32ch), `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (base64 32B), `CORS_ORIGINS`, SendGrid/Twilio creds, `OPENROUTER_API_KEY` (optional).

## 1. Kubernetes (recommended)

```powershell
# create secrets (values from Vault — never commit)
kubectl create namespace appointments
kubectl -n appointments create secret generic hospital-api-secrets `
  --from-literal=DATABASE_URL='postgresql://appoint:<pw>@postgres:5432/appointments?schema=public' `
  --from-literal=JWT_ACCESS_SECRET='<32+ chars>' `
  --from-literal=JWT_REFRESH_SECRET='<32+ chars>' `
  --from-literal=ENCRYPTION_KEY='<base64 32B>' `
  --from-literal=REDIS_URL='redis://redis:6379' `
  --from-literal=CORS_ORIGINS='https://appointments.hospital.local'

helm upgrade --install appointments ./infra/helm/hospital-appointments `
  -n appointments `
  --set api.image.repository='<registry>/hospital-api' `
  --set api.image.tag='<tag>' `
  --set web.image.repository='<registry>/hospital-web' `
  --set web.image.tag='<tag>' `
  --set ingress.apiHost='api.hospital.local' `
  --set ingress.webHost='appointments.hospital.local'
```

Migrations run automatically via the API entrypoint (`prisma migrate deploy`). Verify:

```powershell
kubectl -n appointments rollout status deploy/appointments-api
curl -sk https://api.hospital.local/health
```

## 2. Docker Compose fallback (single VM)

```powershell
Copy-Item .env.example .env
# edit .env: strong POSTGRES_PASSWORD, JWT secrets, ENCRYPTION_KEY, CORS_ORIGINS=https://appointments.hospital.local
docker compose up -d --build
docker compose exec api npx prisma migrate deploy --schema=./prisma/schema.prisma
npm run seed --workspace=apps/api   # first install only
curl http://localhost:4000/health
```

## 3. Backups, monitoring, pipeline

- **Backups:** nightly `pg_dump` + WAL to NAS (7-year retention for medical records); test restores quarterly.
- **Monitoring:** `docker compose --profile observability up prometheus grafana` or in-cluster kube-prometheus; import `infra/monitoring/grafana-dashboard.json`; alert on `ApiDown`.
- **Pipeline:** Jenkinsfile at repo root mirrors GitHub Actions (lint → typecheck → tests → scan → build → migrate → deploy → smoke). Jenkins agents need Node 20, Docker, and `DATABASE_URL`/`REDIS_URL` for integration tests.
- **TLS:** terminate at on-prem ingress/ADC with an internal CA or purchased cert; HSTS + the nginx CSP in `apps/web/nginx.conf`.
