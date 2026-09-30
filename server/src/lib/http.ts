import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { Prisma } from '@prisma/client'
import multer from 'multer'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const asyncHandler = (handler: RequestHandler): RequestHandler =>
  (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next)
  }

export const notFoundHandler = (request: Request, _response: Response, next: NextFunction) => {
  next(new AppError(404, 'NOT_FOUND', `No route for ${request.method} ${request.path}`))
}

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.flatten(),
      },
    })
    return
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    })
    return
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      response.status(409).json({ error: { code: 'CONFLICT', message: 'A record with these values already exists' } })
      return
    }
    if (error.code === 'P2025') {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested record was not found' } })
      return
    }
    if (error.code === 'P2003') {
      response.status(400).json({ error: { code: 'INVALID_RELATION', message: 'The request references an invalid record' } })
      return
    }
  }

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    response.status(statusCode).json({
      error: {
        code: error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
        message: error.message,
      },
    })
    return
  }

  console.error(error)
  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
  })
}