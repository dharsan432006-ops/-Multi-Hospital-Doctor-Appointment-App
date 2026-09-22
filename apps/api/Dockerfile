# syntax=docker/dockerfile:1
# Production API image. Build from REPO ROOT:
#   docker build -f apps/api/Dockerfile -t hospital-api .
# Target stages: base (build) -> runner (minimal prod).
FROM node:20-alpine AS base
WORKDIR /app
# Prisma needs OpenSSL on alpine
RUN apk add --no-cache openssl libc6-compat
COPY apps/api/package.json ./package.json
# No per-app lockfile (npm workspaces keep a single root lockfile);
# install with lockfile when available, otherwise resolve fresh.
COPY package-lock.json ./package-lock.json
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY apps/api/tsconfig.json ./tsconfig.json
COPY apps/api/prisma ./prisma
COPY apps/api/src ./src
COPY docs/openapi.yaml ./docs/openapi.yaml
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat wget \
  && addgroup -S app && adduser -S app -G app
COPY apps/api/package.json ./package.json
COPY package-lock.json ./package-lock.json
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi \
  && npm cache clean --force
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY apps/api/prisma ./prisma
COPY docs/openapi.yaml ./docs/openapi.yaml
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R app:app /app
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health | grep -q '"status":"ok"'
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
