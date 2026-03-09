import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../types/errors';
import { logger } from '../config/logger';

/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      code: err.statusCode,
      error: err.code,
      message: err.message,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      status: 'error',
      code: 400,
      error: ErrorCodes.VALIDATION_FAILED,
      message: 'Validation failed',
      details: err.details,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle unexpected errors
  logger.error('Unexpected error:', err);
  res.status(500).json({
    status: 'error',
    code: 500,
    error: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
};
