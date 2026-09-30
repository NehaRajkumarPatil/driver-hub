import { JobStatus, NotificationType, UserRole, UserStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  userCount: vi.fn(),
  userGroupBy: vi.fn(),
  userUpdate: vi.fn(),
  jobFindUnique: vi.fn(),
  jobUpdateMany: vi.fn(),
  jobFindMany: vi.fn(),
  jobCount: vi.fn(),
  jobGroupBy: vi.fn(),
  jobUpdate: vi.fn(),
  driverProfileFindMany: vi.fn(),
  applicationFindMany: vi.fn(),
  applicationCount: vi.fn(),
  notificationCreate: vi.fn(),
  notificationCreateMany: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findMany: mocks.userFindMany,
      count: mocks.userCount,
      groupBy: mocks.userGroupBy,
      update: mocks.userUpdate,
    },
    job: {
      findUnique: mocks.jobFindUnique,
      updateMany: mocks.jobUpdateMany,
      findMany: mocks.jobFindMany,
      count: mocks.jobCount,
      groupBy: mocks.jobGroupBy,
      update: mocks.jobUpdate,
    },
    driverProfile: { findMany: mocks.driverProfileFindMany },
    application: { findMany: mocks.applicationFindMany, count: mocks.applicationCount },
    notification: { create: mocks.notificationCreate, createMany: mocks.notificationCreateMany },
    $transaction: mocks.transaction,
  },
}))

import { app } from '../src/app.js'
import { signAccessToken } from '../src/middleware/auth.js'

const identities = {
  ADMIN: { userId: 'e5633aaf-2082-49b8-bf2c-809b1d1eb8ad', role: UserRole.ADMIN },
  EMPLOYER: { userId: 'ca90ebf2-60c6-4c09-92c1-20a3a3b8021e', role: UserRole.EMPLOYER },
}

const authHeader = (role: keyof typeof identities) => {
  const identity = identities[role]
  mocks.userFindUnique.mockResolvedValue({ id: identity.userId, role, status: UserStatus.ACTIVE })
  return { Authorization: `Bearer ${signAccessToken(identity)}` }
}

const setupTransaction = () => {
  mocks.transaction.mockImplementation((operation: unknown) => {
    if (Array.isArray(operation)) return Promise.all(operation)
    return (operation as (transaction: unknown) => unknown)({
      job: { findUnique: mocks.jobFindUnique, updateMany: mocks.jobUpdateMany },
      notification: { create: mocks.notificationCreate, createMany: mocks.notificationCreateMany },
      driverProfile: { findMany: mocks.driverProfileFindMany },
    })
  })
}

describe('admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTransaction()
  })

  it('restricts admin endpoints to the ADMIN role', async () => {
    const response = await request(app).get('/api/admin/stats').set(authHeader('EMPLOYER'))
    expect(response.status).toBe(403)
  })

  it('returns user, job-status, and application counts', async () => {
    mocks.userGroupBy.mockResolvedValue([
      { role: UserRole.ADMIN, _count: { _all: 1 } },
      { role: UserRole.EMPLOYER, _count: { _all: 2 } },
      { role: UserRole.DRIVER, _count: { _all: 5 } },
    ])
    mocks.jobGroupBy.mockResolvedValue([
      { status: JobStatus.PENDING, _count: { _all: 2 } },
      { status: JobStatus.APPROVED, _count: { _all: 8 } },
    ])
    mocks.applicationCount.mockResolvedValue(4)

    const response = await request(app).get('/api/admin/stats').set(authHeader('ADMIN'))

    expect(response.status).toBe(200)
    expect(response.body.data.stats).toEqual({
      users: { total: 8, drivers: 5, employers: 2, admins: 1 },
      jobs: { total: 10, pending: 2, approved: 8, rejected: 0, blocked: 0, closed: 0 },
      applications: 4,
    })
  })

  it('filters admin user listings and does not select password hashes', async () => {
    mocks.userFindMany.mockResolvedValue([])
    mocks.userCount.mockResolvedValue(0)

    const response = await request(app).get('/api/admin/users?role=DRIVER&status=ACTIVE&page=2&limit=10')
      .set(authHeader('ADMIN'))

    expect(response.status).toBe(200)
    expect(response.body.data.pagination).toEqual({ page: 2, limit: 10, total: 0, totalPages: 0 })
    const args = mocks.userFindMany.mock.calls[0]![0]
    expect(args.where).toEqual({ role: UserRole.DRIVER, status: UserStatus.ACTIVE })
    expect(args.select.passwordHash).toBeUndefined()
    expect(args.skip).toBe(10)
  })

  it('updates user status and protects admin accounts from blocking', async () => {
    const userId = 'd2719a20-7266-43b2-9922-c357d6cd9534'
    mocks.userFindUnique
      .mockResolvedValueOnce({ id: identities.ADMIN.userId, role: UserRole.ADMIN, status: UserStatus.ACTIVE })
      .mockResolvedValueOnce({ id: userId, role: UserRole.DRIVER })
    mocks.userUpdate.mockResolvedValue({ id: userId, role: UserRole.DRIVER, status: UserStatus.BLOCKED })

    const blocked = await request(app).patch(`/api/admin/users/${userId}/status`)
      .set(authHeader('ADMIN')).send({ status: 'BLOCKED' })
    expect(blocked.status).toBe(200)
    expect(mocks.userUpdate.mock.calls[0]![0].data.status).toBe(UserStatus.BLOCKED)

    mocks.userFindUnique
      .mockResolvedValueOnce({ id: identities.ADMIN.userId, role: UserRole.ADMIN, status: UserStatus.ACTIVE })
      .mockResolvedValueOnce({ id: userId, role: UserRole.ADMIN })
    const protectedAdmin = await request(app).patch(`/api/admin/users/${userId}/status`)
      .set(authHeader('ADMIN')).send({ status: 'BLOCKED' })
    expect(protectedAdmin.status).toBe(400)
  })

  it('approves a job and transactionally notifies the employer and category/location matches', async () => {
    const jobId = '00000000-0000-4000-8000-000000000010'
    const employerId = 'ca90ebf2-60c6-4c09-92c1-20a3a3b8021e'
    mocks.jobFindUnique.mockResolvedValue({
      id: jobId,
      employerId,
      title: 'Regional Truck Driver',
      driverCategory: 'TRUCK',
      location: 'Toronto, ON',
      status: JobStatus.PENDING,
      employer: { companyName: 'Northstar Freight' },
    })
    mocks.jobFindUnique.mockResolvedValueOnce({
      id: jobId,
      employerId,
      title: 'Regional Truck Driver',
      driverCategory: 'TRUCK',
      location: 'Toronto, ON',
      status: JobStatus.PENDING,
      employer: { companyName: 'Northstar Freight' },
    }).mockResolvedValueOnce({ id: jobId, status: JobStatus.APPROVED })
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.notificationCreate.mockResolvedValue({ id: 'employer-notification' })
    mocks.driverProfileFindMany.mockResolvedValue([
      { userId: 'd2719a20-7266-43b2-9922-c357d6cd9534' },
      { userId: 'c7535137-9b2c-4d97-98cf-31404d56c238' },
    ])
    mocks.notificationCreateMany.mockResolvedValue({ count: 2 })

    const response = await request(app).patch(`/api/admin/jobs/${jobId}/status`)
      .set(authHeader('ADMIN')).send({ status: 'APPROVED' })

    expect(response.status).toBe(200)
    expect(response.body.data.job.status).toBe('APPROVED')
    expect(mocks.transaction).toHaveBeenCalled()
    expect(mocks.notificationCreate.mock.calls[0]![0].data).toEqual(expect.objectContaining({
      userId: employerId,
      type: NotificationType.JOB_APPROVED,
    }))
    expect(mocks.driverProfileFindMany.mock.calls[0]![0].where).toEqual({
      isProfilePublic: true,
      OR: [
        { preferredCategories: { has: 'TRUCK' } },
        { location: { equals: 'Toronto, ON', mode: 'insensitive' } },
      ],
    })
    expect(mocks.notificationCreateMany.mock.calls[0]![0].data).toEqual([
      expect.objectContaining({ userId: 'd2719a20-7266-43b2-9922-c357d6cd9534', type: NotificationType.MATCHED_JOB }),
      expect.objectContaining({ userId: 'c7535137-9b2c-4d97-98cf-31404d56c238', type: NotificationType.MATCHED_JOB }),
    ])
  })

  it('does not send duplicate approval notices when an approved job is approved again', async () => {
    const jobId = '00000000-0000-4000-8000-000000000011'
    mocks.jobFindUnique.mockResolvedValue({
      id: jobId,
      employerId: identities.EMPLOYER.userId,
      title: 'Already Approved',
      driverCategory: 'TRUCK',
      location: 'Toronto, ON',
      status: JobStatus.APPROVED,
      employer: { companyName: 'Northstar Freight' },
    })
    mocks.jobFindUnique.mockResolvedValueOnce({
      id: jobId,
      employerId: identities.EMPLOYER.userId,
      title: 'Already Approved',
      driverCategory: 'TRUCK',
      location: 'Toronto, ON',
      status: JobStatus.APPROVED,
      employer: { companyName: 'Northstar Freight' },
    }).mockResolvedValueOnce({ id: jobId, status: JobStatus.APPROVED })
    mocks.jobUpdateMany.mockResolvedValue({ count: 0 })

    const response = await request(app).patch(`/api/admin/jobs/${jobId}/status`)
      .set(authHeader('ADMIN')).send({ status: 'APPROVED' })

    expect(response.status).toBe(200)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
    expect(mocks.driverProfileFindMany).not.toHaveBeenCalled()
  })

  it('lists jobs by moderation status and lists applications', async () => {
    mocks.jobFindMany.mockResolvedValue([])
    mocks.jobCount.mockResolvedValue(0)
    const jobs = await request(app).get('/api/admin/jobs?status=PENDING').set(authHeader('ADMIN'))
    expect(jobs.status).toBe(200)
    expect(mocks.jobFindMany.mock.calls[0]![0].where.status).toBe(JobStatus.PENDING)

    mocks.applicationFindMany.mockResolvedValue([])
    mocks.applicationCount.mockResolvedValue(0)
    const applications = await request(app).get('/api/admin/applications?status=APPLIED')
      .set(authHeader('ADMIN'))
    expect(applications.status).toBe(200)
    expect(mocks.applicationFindMany.mock.calls[0]![0].where.status).toBe('APPLIED')
  })
})