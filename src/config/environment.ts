import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || 'localhost',
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',

  // Redis
  REDIS_ENABLED: process.env.REDIS_ENABLED === 'true',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Sentry
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || 'development',

  // Email
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'TEST',
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_PASSWORD: process.env.GMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@test-jedi.com',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Integrations
  JIRA_APP_ID: process.env.JIRA_APP_ID,
  GITHUB_APP_ID: process.env.GITHUB_APP_ID,
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-session-secret',

  // Bcrypt
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  // AWS S3 (for exports)
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'test-jedi-exports',

  // Redis (for export queue)
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
};
