import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startTime = Date.now();

  // Log request
  logger.info(
    `[${req.method}] ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('user-agent')}`,
  );

  // Override res.json to log response
  const originalJson = res.json;

  res.json = function (data: any) {
    const duration = Date.now() - startTime;
    logger.info(
      `[${req.method}] ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`,
    );
    return originalJson.call(this, data);
  };

  next();
};
