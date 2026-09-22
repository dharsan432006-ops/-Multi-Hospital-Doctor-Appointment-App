// Jenkins equivalent of .github/workflows/ci.yml + deploy.yml for on-prem (Bangalore DC).
pipeline {
  agent any
  tools { nodejs 'node-20' }
  environment {
    TZ = 'Asia/Kolkata'
    DATABASE_URL = credentials('appointments-db-url')
    REDIS_URL = 'redis://redis:6379'
    JWT_ACCESS_SECRET = credentials('jwt-access-secret')
    JWT_REFRESH_SECRET = credentials('jwt-refresh-secret')
    ENCRYPTION_KEY = credentials('app-encryption-key')
  }
  stages {
    stage('Install') { steps { sh 'npm ci --no-audit --no-fund' } }
    stage('Lint+Typecheck') {
      parallel {
        stage('Lint') { steps { sh 'npm run lint --workspaces --if-present || true' } }
        stage('Typecheck') { steps { sh 'npm run typecheck --workspaces --if-present' } }
      }
    }
    stage('Test') {
      steps {
        sh 'npm run prisma:generate --workspace=apps/api'
        sh 'npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma'
        sh 'npm run test --workspaces --if-present'
      }
    }
    stage('Build images') {
      steps {
        sh 'docker build -f apps/api/Dockerfile -t hospital-api:$BUILD_NUMBER .'
        // VITE_API_URL is baked at build time. For same-origin nginx deploys
        // leave it as /api (Dockerfile default). For separate API hosts pass
        // an absolute URL with /api suffix, e.g. VITE_API_URL=https://api.<prod>/api.
        // Jenkins env VITE_API_URL must already include the /api suffix when set.
        sh 'docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=${VITE_API_URL:-/api} -t hospital-web:$BUILD_NUMBER .'
      }
    }
    stage('Deploy (Helm)') {
      when { branch 'main' }
      steps {
        sh 'helm upgrade --install appointments ./infra/helm/hospital-appointments -n appointments --create-namespace --set api.image.tag=$BUILD_NUMBER --set web.image.tag=$BUILD_NUMBER'
      }
    }
    stage('Smoke') {
      when { branch 'main' }
      // Check BOTH the shallow web/API liveness (/health) and the deep
      // dependency check (/api/health: postgres + redis). A 200 on /health
      // alone must not count as healthy when the DB is down.
      steps { sh 'curl -sf $SMOKE_API_URL/health | grep -q ok; curl -sf $SMOKE_API_URL/api/health | grep -q ok' }
    }
  }
  post {
    always { junit allowEmptyResults: true, testResults: '**/junit.xml' }
    failure { mail to: 'platform@example.test', subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}", body: "See ${env.BUILD_URL}" }
  }
}
