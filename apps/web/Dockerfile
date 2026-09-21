# syntax=docker/dockerfile:1
# Production web image. Build from REPO ROOT:
#   docker build -f apps/web/Dockerfile -t hospital-web --build-arg VITE_API_URL=https://api.example.com/api .
ARG VITE_API_URL=http://localhost:4000/api
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY apps/web/package.json ./package.json
COPY package-lock.json ./package-lock.json
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY apps/web/tsconfig.json ./tsconfig.json
COPY apps/web/vite.config.ts ./vite.config.ts
COPY apps/web/index.html ./index.html
COPY apps/web/src ./src
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ | grep -q "<div id=\"root\""
CMD ["nginx", "-g", "daemon off;"]
