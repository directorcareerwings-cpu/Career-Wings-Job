import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: unknown = null,
  message = 'Success',
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  message = 'Error',
  statusCode = 400,
  errors?: unknown
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

export const sendPaginated = (
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
  meta?: Record<string, unknown>
): Response => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    ...(meta ? { meta } : {}),
  });
};
