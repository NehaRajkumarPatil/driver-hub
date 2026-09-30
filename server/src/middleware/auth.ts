import type { RequestHandler } from 'express'
import { UserRole, UserStatus } from '@prisma/client'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError, asyncHandler } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'

export type AuthIdentity = { userId: string; role: UserRole }

declare global {
  namespace Express {
    interface Request {
      auth?: AuthIdentity
    }
  }
}

export const signAccessToken = (identity: AuthIdentity): string =>
  jwt.sign({ role: identity.role }, env.jwtSecret, {
    subject: identity.userId,
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  })

export const requireAuth: RequestHandler = asyncHandler(async (request, _response, next) => {
  const authorization = request.header('authorization')
  const [scheme, token] = authorization?.split(' ') ?? []

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHORIZED', 'A bearer access token is required')
  }

  let payload: jwt.JwtPayload
  try {
    const verified = jwt.verify(token, env.jwtSecret)
    if (typeof verified === 'string' || !verified.sub) {
      throw new Error('Invalid token subject')
    }
    payload = verified
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, status: true },
  })

  if (!user) throw new AppError(401, 'INVALID_TOKEN', 'The account for this token no longer exists')
  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked')
  }

  request.auth = { userId: user.id, role: user.role }
  next()
})

export const requireRole = (...allowedRoles: UserRole[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.auth) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required'))
      return
    }
    if (!allowedRoles.includes(request.auth.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Your account role cannot access this resource'))
      return
    }
    next()
  }