# Bangalore Hospital Appointments — Terraform (AWS ap-south-1, Mumbai)

All data stays in India (`ap-south-1`). RDS + ElastiCache live in private
subnets; only the ALB (API) and CloudFront (web) are public.

## Prereqs

- Terraform >= 1.6, AWS CLI v2, an IAM role with VPC/RDS/ElastiCache/ECS/CloudFront/SecretsManager/CloudWatch rights.
- S3 backend bucket + DynamoDB lock table (see `versions.tf` — uncomment after creating).

## Staging

```powershell
cd infra/terraform
terraform init
terraform workspace new staging  # or -backend-config per env
terraform plan -var="environment=staging" -var="api_image=ghcr.io/<org>/<repo>-api:<tag>" -out staging.tfplan
terraform apply staging.tfplan
```

Set secrets (never commit values):

```powershell
aws secretsmanager put-secret-value --secret-id hosp-staging/app `
  --secret-string '{"DATABASE_URL":"postgresql://...","JWT_ACCESS_SECRET":"...","JWT_REFRESH_SECRET":"...","ENCRYPTION_KEY":"...","SENDGRID_API_KEY":"..."}' `
  --region ap-south-1
```

Run migrations from CI (`deploy.yml`) or locally:

```powershell
$env:DATABASE_URL="postgresql://appoint:<pw>@<rds-endpoint>:5432/appointments?schema=public"
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

## Production

Same flow with `-var="environment=production"`, `db.t3.small` or larger,
`desired_count=3`, deletion protection ON, and an ACM cert + Route53 alias
in front of the ALB/CloudFront (add `aws_lb_listener` HTTPS + `aws_route53_record`).

## Notes

- RDS: Postgres 16, Multi-AZ, encrypted, 7-day backups, final snapshot kept.
- Redis: ElastiCache Redis 7 with transit + at-rest encryption.
- ECS: Fargate + Container Insights; logs to CloudWatch `/ecs/<name>-api` (30d, no PHI).
- Alarms: ALB 5xx, RDS CPU/storage → SNS topic (set `alert_email`).
- Web: private S3 + OAC CloudFront with SPA 403/404 → `/index.html` rewrites.
