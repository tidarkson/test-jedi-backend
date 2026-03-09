"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const environment_1 = require("./config/environment");
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const requestLogger_1 = require("./middleware/requestLogger");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const testRepository_1 = __importDefault(require("./routes/testRepository"));
const app = (0, express_1.default)();
/**
 * Initialize database and cache
 */
const initializeApp = async () => {
    try {
        // Initialize Prisma
        (0, database_1.initializePrisma)();
        logger_1.logger.info('Prisma initialized');
        // Initialize Redis (optional)
        if (environment_1.config.REDIS_ENABLED) {
            try {
                await (0, redis_1.initializeRedis)();
                logger_1.logger.info('Redis initialized');
            }
            catch (error) {
                logger_1.logger.warn('Redis initialization failed, continuing without cache');
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize app:', error);
        throw error;
    }
};
/**
 * Middleware Configuration
 * Order matters! Each middleware depends on previous ones
 */
// 1. Security headers
app.use((0, helmet_1.default)());
// 2. CORS
const corsOptions = {
    origin: environment_1.config.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use((0, cors_1.default)(corsOptions));
// 3. Body parsing (MUST be before session)
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// 4. Request logging
app.use(requestLogger_1.requestLogger);
/**
 * Routes
 */
app.use(`/api/${environment_1.config.API_VERSION}/auth`, auth_1.default);
app.use(`/api/${environment_1.config.API_VERSION}/projects`, testRepository_1.default);
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});
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
app.use(errorHandler_1.errorHandler);
/**
 * Start server
 */
const startServer = async () => {
    try {
        // Initialize app (database, cache, etc.)
        await initializeApp();
        // Start listening
        app.listen(environment_1.config.PORT, environment_1.config.HOST, () => {
            logger_1.logger.info(`Server running on http://${environment_1.config.HOST}:${environment_1.config.PORT} in ${environment_1.config.NODE_ENV} mode`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger_1.logger.info('Shutting down gracefully...');
    try {
        const prisma = (0, database_1.getPrisma)();
        await prisma.$disconnect();
        logger_1.logger.info('Database disconnected');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Error during shutdown:', error);
        process.exit(1);
    }
});
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map