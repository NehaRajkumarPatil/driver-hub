import bcrypt from 'bcrypt'
import express from 'express'
import { UserRole, UserStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}))

import { app } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { errorHandler } from '../src/lib/http.js'
import { requireAuth, requireRole, signAccessToken } from '../src/middleware/auth.js'

const userFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'd2719a20-7266-43b2-9922-c357d6cd9534',
  name: 'Jamie Driver',
  email: 'jamie@example.com',
  phone: '+1-416-555-0140',
  role: UserRole.DRIVER,
  status: UserStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  driverProfile: null,
  employerProfile: null,
  ...overrides,
})

const getUserMock = () => prisma.user as unknown as {
  create: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  findUniqueOrThrow: ReturnType<typeof vi.fn>
}

describe('authentication API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('registers a driver, hashes the password, and returns an access token', async () => {
    const publicUser = userFixture()
    getUserMock().create.mockResolvedValue(publicUser)

    const response = await request(app).post('/api/auth/register').send({
      name: 'Jamie Driver',
      email: 'Jamie@Example.com',
      password: 'StrongPass123',
      role: 'DRIVER',
    })

    expect(response.status).toBe(201)
    expect(response.body.data.user.email).toBe('jamie@example.com')
    expect(response.body.data.user.passwordHash).toBeUndefined()
    expect(response.body.data.accessToken).toEqual(expect.any(String))
    const createArgs = getUserMock().create.mock.calls[0]![0]
    expect(createArgs.data.driverProfile).toEqual({ create: {} })
    expect(await bcrypt.compare('StrongPass123', createArgs.data.passwordHash)).toBe(true)
  })

  it('rejects ADMIN self-registration and malformed requests', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'StrongPass123',
      role: 'ADMIN',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(getUserMock().create).not.toHaveBeenCalled()
  })

  it('rejects invalid credentials without revealing whether the email exists', async () => {
    getUserMock().findUnique.mockResolvedValue(null)

    const response = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.com',
      password: 'wrong-password',
    })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('does not issue tokens to blocked users', async () => {
    const passwordHash = await bcrypt.hash('StrongPass123', 4)
    getUserMock().findUnique.mockResolvedValue(userFixture({ passwordHash, status: UserStatus.BLOCKED }))

    const response = await request(app).post('/api/auth/login').send({
      email: 'jamie@example.com',
      password: 'StrongPass123',
    })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('ACCOUNT_BLOCKED')
  })

  it('returns the current account for a valid access token', async () => {
    const publicUser = userFixture()
    getUserMock().findUnique
      .mockResolvedValueOnce({ id: publicUser.id, role: publicUser.role, status: publicUser.status })
      .mockResolvedValueOnce(publicUser)

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signAccessToken({ userId: publicUser.id, role: UserRole.DRIVER })}`)

    expect(response.status).toBe(200)
    expect(response.body.data.user.email).toBe('jamie@example.com')
  })

  it('blocks a previously issued token as soon as the account is blocked', async () => {
    const publicUser = userFixture()
    getUserMock().findUnique.mockResolvedValue({
      id: publicUser.id,
      role: UserRole.DRIVER,
      status: UserStatus.BLOCKED,
    })

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signAccessToken({ userId: publicUser.id, role: UserRole.DRIVER })}`)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('ACCOUNT_BLOCKED')
  })

  it('enforces the current database role instead of trusting the JWT role', async () => {
    const protectedApp = express()
    protectedApp.get('/employer-only', requireAuth, requireRole(UserRole.EMPLOYER), (_request, response) => {
      response.status(200).json({ data: { allowed: true } })
    })
    protectedApp.use(errorHandler)
    const publicUser = userFixture()
    getUserMock().findUnique.mockResolvedValue({
      id: publicUser.id,
      role: UserRole.EMPLOYER,
      status: UserStatus.ACTIVE,
    })

    const response = await request(protectedApp)
      .get('/employer-only')
      .set('Authorization', `Bearer ${signAccessToken({ userId: publicUser.id, role: UserRole.DRIVER })}`)

    expect(response.status).toBe(200)
    expect(response.body.data.allowed).toBe(true)
  })

  it('requires a bearer token for /auth/me', async () => {
    const response = await request(app).get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })
})