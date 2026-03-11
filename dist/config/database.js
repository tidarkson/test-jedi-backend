"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.getPrisma = exports.initializePrisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const isProduction = process.env.NODE_ENV === 'production';
// Connection pool size: production 20 max (sufficient for 500 concurrents via PgBouncer),
// development 5 max to stay lean.
const connectionLimit = isProduction ? 20 : 5;
// Prisma datasource connection_limit mirrors PgBouncer pool size
// The DATABASE_URL can also embed ?connection_limit=20&pool_timeout=10 parameters
const datasourceUrl = (() => {
    const url = process.env.DATABASE_URL || '';
    if (!url.includes('connection_limit=') && url) {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}connection_limit=${connectionLimit}&pool_timeout=10`;
    }
    return url;
})();
let prisma = null;
exports.prisma = prisma;
const initializePrisma = () => {
    if (prisma) {
        return prisma;
    }
    exports.prisma = prisma = new client_1.PrismaClient({
        log: isProduction ? ['warn', 'error'] : ['warn', 'error'],
        datasources: {
            db: {
                url: datasourceUrl,
            },
        },
    });
    // Use process.on for beforeExit in library engine (Prisma 5.0.0+)
    process.on('beforeExit', async () => {
        if (prisma) {
            logger_1.logger.info('Prisma disconnecting');
            await prisma.$disconnect();
        }
    });
    logger_1.logger.info(`Prisma client initialized (pool max=${connectionLimit}, env=${process.env.NODE_ENV || 'development'})`);
    return prisma;
};
exports.initializePrisma = initializePrisma;
const getPrisma = () => {
    if (!prisma) {
        return (0, exports.initializePrisma)();
    }
    return prisma;
};
exports.getPrisma = getPrisma;
//# sourceMappingURL=database.js.map