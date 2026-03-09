"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.getPrisma = exports.initializePrisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
let prisma = null;
exports.prisma = prisma;
const initializePrisma = () => {
    if (prisma) {
        return prisma;
    }
    exports.prisma = prisma = new client_1.PrismaClient({
        log: ['warn', 'error'],
    });
    // Use process.on for beforeExit in library engine (Prisma 5.0.0+)
    process.on('beforeExit', async () => {
        if (prisma) {
            logger_1.logger.info('Prisma disconnecting');
            await prisma.$disconnect();
        }
    });
    logger_1.logger.info('Prisma client initialized');
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