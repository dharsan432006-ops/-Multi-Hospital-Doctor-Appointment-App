# Compliance — DPDPA 2023 + SPDI (summary; not legal advice)

This app treats health records as sensitive personal data. Controls implemented:

## 1. Consent (purpose-specific, withdrawable)

- Registration requires explicit checkboxes; `MEDICAL_CARE` is mandatory for booking, others (`APPOINTMENT_COMMUNICATIONS`, `INSURANCE`, `RESEARCH`) optional.
- Stored in `ConsentRecord(userId, purpose, policyVersion, grantedAt, withdrawnAt)`. Withdraw via `DELETE /api/consents/:purpose` or Profile → consent toggles.
- Booking service rejects without active `MEDICAL_CARE`; notification service honours opt-out for non-essential messages (reminders still require care consent).

## 2. Encryption

- TLS everywhere (ALB/CloudFront HTTPS in prod; HSTS via ingress/nginx in on-prem).
- At rest: RDS + ElastiCache encryption, S3 SSE, Secrets Manager/KMS for secrets.
- Application-level **AES-256-GCM** for `Patient.medicalNotesEnc` (`ENCRYPTION_KEY` = base64 32B from KMS/Secrets Manager; `PREV_ENCRYPTION_KEY` supports rotation — decrypt old, re-encrypt new).

## 3. Data residency (India)

- All storage, backups, logs in **ap-south-1 (Mumbai)**; Terraform defaults to `ap-south-1`, no cross-region replication.
- Notification providers must use India-resident/DLT-compliant routes: SendGrid sender + Twilio DLT template IDs configured per environment; default dev provider is `console` (no external transfer).
- AI helper (OpenRouter) sends only the user-typed symptom text (capped, no PHI auto-attached) and is disabled (503) without a key.

## 4. Retention (7 years, Indian Medical Council)

- Appointment/medical records retained ≥ 7 years. Implement the retention job (admin-approved archive/delete only after the period) before handling erasure requests that conflict with this duty.
- Support data-principal access/correction via `GET/PUT /api/patients/me` (audited); erasure only where legally permitted.

## 5. Audit logging

- Append-only `AuditLog(actorUserId, action, entityType, entityId, ip, userAgent, metadata)` on patient-record reads/writes, role changes, admin actions. No updates/deletes via API. Viewer at `/admin` (ADMIN only).

## 6. Minimal exposure

- Pino redacts `password/email/phone/authorization`; admin lists mask phone/email by default; no PHI in logs or error details.
- Short JWT TTL (15m), rotating refresh with reuse detection, rate limits + lockout on auth routes, Helmet + strict CORS allow-list.

## 7. Telemedicine

Out of scope. If added later: E2EE video, separate consent, no recording without explicit consent.
