import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import { logger } from './config/logger';
import { initializePrisma, getPrisma } from './config/database';
import { initializeRedis } from './config/redis';
import { openApiSpec } from './config/openapi';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import testRepositoryRoutes from './routes/testRepository';
import runsRoutes from './routes/runs';
import plansRoutes from './routes/plans';
import adminRoutes from './routes/admin';
import exportsRoutes from './routes/exports';
import integrationsRoutes from './routes/integrations';
import analyticsRoutes from './routes/analytics';
import { attachWebSocketServer } from './utils/runWebsocket';
import { jobScheduler } from './workers/JobScheduler';

const app = express();

/**
 * Initialize database and cache
 */
const initializeApp = async () => {
  try {
    // Initialize Prisma
    initializePrisma();
    logger.info('Prisma initialized');

    // Initialize Redis (optional)
    if (config.REDIS_ENABLED) {
      try {
        await initializeRedis();
        logger.info('Redis initialized');
      } catch (error) {
        logger.warn('Redis initialization failed, continuing without cache');
      }
    }

    // Initialize scheduled jobs
    jobScheduler.initializeJobs();
    logger.info('Background jobs initialized');
  } catch (error) {
    logger.error('Failed to initialize app:', error);
    throw error;
  }
};

/**
 * Middleware Configuration
 * Order matters! Each middleware depends on previous ones
 */

// 1. Security headers
app.use(helmet());

// 2. CORS
const corsOptions = {
  origin: config.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// 3. Body parsing (MUST be before session)
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: ['application/xml', 'text/xml'], limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Request logging
app.use(requestLogger);

/**
 * Routes
 */
app.use(`/api/${config.API_VERSION}/auth`, authRoutes);
app.use(`/api/${config.API_VERSION}/admin`, adminRoutes);
// Test repository routes are project-scoped and require :projectId in path.
app.use(`/api/${config.API_VERSION}/projects/:projectId`, testRepositoryRoutes);
app.use(`/api/${config.API_VERSION}`, runsRoutes);
app.use(`/api/${config.API_VERSION}`, plansRoutes);
app.use(`/api/${config.API_VERSION}`, exportsRoutes);
app.use(`/api/${config.API_VERSION}`, integrationsRoutes);
app.use(`/api/${config.API_VERSION}`, analyticsRoutes);

// Health check endpoint
/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check
 *     description: Returns basic service health information.
 *     responses:
 *       200:
 *         description: Service is healthy.
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/docs.json', (_req, res) => {
  res.json(openApiSpec);
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

// 5. Global error handler (MUST be last)
app.use(errorHandler);

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Initialize app (database, cache, etc.)
    await initializeApp();

    if (config.NODE_ENV === 'test') {
      logger.info('Test environment detected, skipping HTTP listen');
      return;
    }

    // Create HTTP server and attach WebSocket server
    const server = http.createServer(app);
    attachWebSocketServer(server);

    server.listen(config.PORT, config.HOST, () => {
      logger.info(
        `Server running on http://${config.HOST}:${config.PORT} in ${config.NODE_ENV} mode`,
      );
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  try {
    // Stop scheduled jobs
    jobScheduler.stopAllJobs();
    logger.info('Scheduled jobs stopped');

    const prisma = getPrisma();
    await prisma.$disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();

export default app;
