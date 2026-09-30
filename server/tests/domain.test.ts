import { ApplicationStatus, JobStatus, NotificationType, UserRole, UserStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  driverProfileFindUniqueOrThrow: vi.fn(),
  driverProfileFindMany: vi.fn(),
  driverProfileCount: vi.fn(),
  driverProfileUpsert: vi.fn(),
  driverExperienceFindMany: vi.fn(),
  driverExperienceFindFirst: vi.fn(),
  driverExperienceUpdate: vi.fn(),
  jobFindMany: vi.fn(),
  jobCount: vi.fn(),
  jobFindFirst: vi.fn(),
  jobCreate: vi.fn(),
  jobUpdate: vi.fn(),
  jobDeleteMany: vi.fn(),
  applicationFindMany: vi.fn(),
  applicationFindFirst: vi.fn(),
  applicationCreate: vi.fn(),
  applicationUpdate: vi.fn(),
  savedJobFindMany: vi.fn(),
  savedJobUpsert: vi.fn(),
  savedJobDeleteMany: vi.fn(),
  employerProfileFindUnique: vi.fn(),
  employerProfileUpdate: vi.fn(),
  documentFindMany: vi.fn(),
  documentCreate: vi.fn(),
  documentFindFirst: vi.fn(),
  documentDelete: vi.fn(),
  notificationCreate: vi.fn(),
  notificationCreateMany: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationFindUniqueOrThrow: vi.fn(),
  notificationUpdateMany: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    driverProfile: {
      findUniqueOrThrow: mocks.driverProfileFindUniqueOrThrow,
      findMany: mocks.driverProfileFindMany,
      count: mocks.driverProfileCount,
      upsert: mocks.driverProfileUpsert,
    },
    driverExperience: {
      findMany: mocks.driverExperienceFindMany,
      findFirst: mocks.driverExperienceFindFirst,
      update: mocks.driverExperienceUpdate,
    },
    job: {
      findMany: mocks.jobFindMany,
      count: mocks.jobCount,
      findFirst: mocks.jobFindFirst,
      create: mocks.jobCreate,
      update: mocks.jobUpdate,
      deleteMany: mocks.jobDeleteMany,
    },
    application: {
      findMany: mocks.applicationFindMany,
      findFirst: mocks.applicationFindFirst,
      create: mocks.applicationCreate,
      update: mocks.applicationUpdate,
    },
    savedJob: {
      findMany: mocks.savedJobFindMany,
      upsert: mocks.savedJobUpsert,
      deleteMany: mocks.savedJobDeleteMany,
    },
    employerProfile: {
      findUnique: mocks.employerProfileFindUnique,
      update: mocks.employerProfileUpdate,
    },
    document: {
      findMany: mocks.documentFindMany,
      create: mocks.documentCreate,
      findFirst: mocks.documentFindFirst,
      delete: mocks.documentDelete,
    },
    notification: {
      create: mocks.notificationCreate,
      createMany: mocks.notificationCreateMany,
      findMany: mocks.notificationFindMany,
      findUniqueOrThrow: mocks.notificationFindUniqueOrThrow,
      updateMany: mocks.notificationUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('../src/lib/storage.js', () => ({
  storeDocument: vi.fn(),
  removeStoredDocument: vi.fn(),
}))

import { app } from '../src/app.js'
import { signAccessToken } from '../src/middleware/auth.js'
import { storeDocument } from '../src/lib/storage.js'

const identity = {
  DRIVER: { userId: 'd2719a20-7266-43b2-9922-c357d6cd9534', role: UserRole.DRIVER },
  EMPLOYER: { userId: 'ca90ebf2-60c6-4c09-92c1-20a3a3b8021e', role: UserRole.EMPLOYER },
}

const authenticate = (role: keyof typeof identity) => {
  const account = identity[role]
  mocks.userFindUnique.mockResolvedValue({ id: account.userId, role: account.role, status: UserStatus.ACTIVE })
  return { Authorization: `Bearer ${signAccessToken(account)}` }
}

const setupTransaction = () => {
  mocks.transaction.mockImplementation((operation: unknown) => {
    if (Array.isArray(operation)) return Promise.all(operation)
    return (operation as (transaction: unknown) => unknown)({
      job: { findFirst: mocks.jobFindFirst },
      application: { create: mocks.applicationCreate },
      notification: { create: mocks.notificationCreate },
    })
  })
}

describe('Phase 2 domain APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTransaction()
  })

  it('only searches approved jobs and applies supported filters and pagination', async () => {
    mocks.jobFindMany.mockResolvedValue([])
    mocks.jobCount.mockResolvedValue(0)

    const response = await request(app).get('/api/jobs?category=TRUCK&location=Toronto&minSalary=30&experience=5&page=2&limit=5')

    expect(response.status).toBe(200)
    expect(response.body.data.pagination).toEqual({ page: 2, limit: 5, total: 0, totalPages: 0 })
    const args = mocks.jobFindMany.mock.calls[0]![0]
    const where = args.where
    expect(where.status).toBe(JobStatus.APPROVED)
    expect(where.driverCategory).toBe('TRUCK')
    expect(args.skip).toBe(5)
    expect(args.take).toBe(5)
    expect(where.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({ location: expect.objectContaining({ contains: 'Toronto' }) }),
      expect.objectContaining({ experienceRequired: { lte: 5 } }),
    ]))
  })

  it('scopes driver profile reads and updates to the authenticated driver', async () => {
    mocks.driverProfileFindUniqueOrThrow.mockResolvedValue({ userId: identity.DRIVER.userId, experiences: [] })
    const getResponse = await request(app).get('/api/driver/profile').set(authenticate('DRIVER'))
    expect(getResponse.status).toBe(200)
    expect(mocks.driverProfileFindUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: identity.DRIVER.userId },
    }))

    mocks.driverProfileUpsert.mockResolvedValue({ userId: identity.DRIVER.userId, bio: 'Local and long haul' })
    const putResponse = await request(app)
      .put('/api/driver/profile')
      .set(authenticate('DRIVER'))
      .send({ bio: 'Local and long haul', skills: ['Defensive driving'] })
    expect(putResponse.status).toBe(200)
    expect(mocks.driverProfileUpsert.mock.calls[0]![0].where).toEqual({ userId: identity.DRIVER.userId })
  })

  it('creates applications only for approved jobs and notifies the owning employer', async () => {
    mocks.jobFindFirst.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001', title: 'Long Haul Driver', employerId: identity.EMPLOYER.userId })
    mocks.applicationCreate.mockResolvedValue({ id: 'application-1', status: ApplicationStatus.APPLIED })
    mocks.notificationCreate.mockResolvedValue({ id: 'notification-1' })

    const response = await request(app)
      .post('/api/jobs/00000000-0000-4000-8000-000000000001/apply')
      .set(authenticate('DRIVER'))
      .send({ coverNote: 'Six years of experience' })

    expect(response.status).toBe(201)
    expect(mocks.jobFindFirst.mock.calls[0]![0].where.status).toBe(JobStatus.APPROVED)
    expect(mocks.applicationCreate.mock.calls[0]![0].data.driverId).toBe(identity.DRIVER.userId)
    expect(mocks.notificationCreate.mock.calls[0]![0].data).toEqual(expect.objectContaining({
      userId: identity.EMPLOYER.userId,
      type: NotificationType.APPLICATION_RECEIVED,
    }))
  })

  it('creates employer jobs in pending moderation state', async () => {
    mocks.jobCreate.mockResolvedValue({ id: 'job-pending', status: JobStatus.PENDING })

    const response = await request(app)
      .post('/api/employer/jobs')
      .set(authenticate('EMPLOYER'))
      .send({
        title: 'Regional Truck Driver',
        driverCategory: 'TRUCK',
        description: 'Drive regional routes and complete daily vehicle checks.',
        location: 'Toronto, ON',
        salaryMin: 30,
        salaryMax: 35,
        experienceRequired: 2,
        requiredDocuments: ['Valid licence'],
      })

    expect(response.status).toBe(201)
    expect(mocks.jobCreate.mock.calls[0]![0].data).toEqual(expect.objectContaining({
      employerId: identity.EMPLOYER.userId,
      status: JobStatus.PENDING,
    }))
  })

  it('keeps experience records scoped to their driver', async () => {
    mocks.driverExperienceFindFirst.mockResolvedValue(null)

    const response = await request(app)
      .put('/api/driver/experience/00000000-0000-4000-8000-000000000006')
      .set(authenticate('DRIVER'))
      .send({ years: 4 })

    expect(response.status).toBe(404)
    expect(mocks.driverExperienceFindFirst.mock.calls[0]![0].where).toEqual({
      id: '00000000-0000-4000-8000-000000000006',
      driverId: identity.DRIVER.userId,
    })
  })

  it('stores an uploaded document under the authenticated driver', async () => {
    vi.mocked(storeDocument).mockResolvedValue({
      fileName: 'stored-resume.pdf',
      fileUrl: '/uploads/stored-resume.pdf',
      storageKey: 'uploads/stored-resume.pdf',
    })
    mocks.documentCreate.mockResolvedValue({ id: 'document-1', type: 'RESUME' })

    const response = await request(app)
      .post('/api/documents')
      .set(authenticate('DRIVER'))
      .field('type', 'RESUME')
      .attach('file', Buffer.from('%PDF-1.7 test'), { filename: 'resume.pdf', contentType: 'application/pdf' })

    expect(response.status).toBe(201)
    expect(mocks.documentCreate.mock.calls[0]![0].data).toEqual(expect.objectContaining({
      userId: identity.DRIVER.userId,
      type: 'RESUME',
      fileUrl: '/uploads/stored-resume.pdf',
    }))
  })

  it('does not expose applicant contact data until shortlisted', async () => {
    mocks.applicationFindFirst.mockResolvedValue({
      status: ApplicationStatus.APPLIED,
      driver: { user: { name: 'Jamie', email: 'private@example.com', phone: '+1-416-555-0100' } },
    })

    const denied = await request(app)
      .get('/api/employer/applications/00000000-0000-4000-8000-000000000002/contact')
      .set(authenticate('EMPLOYER'))
    expect(denied.status).toBe(403)
    expect(JSON.stringify(denied.body)).not.toContain('private@example.com')

    mocks.applicationFindFirst.mockResolvedValue({
      status: ApplicationStatus.SHORTLISTED,
      driver: { user: { name: 'Jamie', email: 'private@example.com', phone: '+1-416-555-0100' } },
    })
    const allowed = await request(app)
      .get('/api/employer/applications/00000000-0000-4000-8000-000000000002/contact')
      .set(authenticate('EMPLOYER'))
    expect(allowed.status).toBe(200)
    expect(allowed.body.data.contact).toEqual({ name: 'Jamie', email: 'private@example.com', phone: '+1-416-555-0100' })
  })

  it('does not allow an employer to reach another employer application contact', async () => {
    mocks.applicationFindFirst.mockResolvedValue(null)
    const response = await request(app)
      .get('/api/employer/applications/00000000-0000-4000-8000-000000000003/contact')
      .set(authenticate('EMPLOYER'))

    expect(response.status).toBe(404)
    expect(mocks.applicationFindFirst.mock.calls[0]![0].where).toEqual(expect.objectContaining({
      job: { employerId: identity.EMPLOYER.userId },
    }))
  })

  it('notifies the driver when an employer changes their application status', async () => {
    const applicationId = '00000000-0000-4000-8000-000000000007'
    mocks.applicationFindFirst.mockResolvedValue({
      id: applicationId,
      driverId: identity.DRIVER.userId,
      status: ApplicationStatus.APPLIED,
      job: { id: 'job-2', title: 'Regional Driver' },
    })
    mocks.applicationUpdate.mockResolvedValue({ id: applicationId, status: ApplicationStatus.SHORTLISTED })
    mocks.notificationCreate.mockResolvedValue({ id: 'notification-2' })

    const response = await request(app)
      .patch(`/api/applications/${applicationId}/status`)
      .set(authenticate('EMPLOYER'))
      .send({ status: 'SHORTLISTED' })

    expect(response.status).toBe(200)
    expect(mocks.applicationFindFirst.mock.calls[0]![0].where).toEqual({
      id: applicationId,
      job: { employerId: identity.EMPLOYER.userId },
    })
    expect(mocks.notificationCreate.mock.calls[0]![0].data).toEqual(expect.objectContaining({
      userId: identity.DRIVER.userId,
      type: NotificationType.APPLICATION_STATUS,
    }))
  })

  it('only marks notifications belonging to the authenticated user as read', async () => {
    mocks.notificationUpdateMany.mockResolvedValue({ count: 0 })
    const response = await request(app)
      .patch('/api/notifications/00000000-0000-4000-8000-000000000004/read')
      .set(authenticate('DRIVER'))

    expect(response.status).toBe(404)
    expect(mocks.notificationUpdateMany.mock.calls[0]![0].where).toEqual({
      id: '00000000-0000-4000-8000-000000000004',
      userId: identity.DRIVER.userId,
    })
  })

  it('requires driver role for document endpoints', async () => {
    const response = await request(app)
      .get('/api/documents')
      .set(authenticate('EMPLOYER'))

    expect(response.status).toBe(403)
  })

  it('keeps unapproved job details hidden from public requests', async () => {
    mocks.jobFindFirst.mockResolvedValue(null)
    const response = await request(app).get('/api/jobs/00000000-0000-4000-8000-000000000005')

    expect(response.status).toBe(404)
    expect(mocks.jobFindFirst.mock.calls[0]![0].where.status).toBe(JobStatus.APPROVED)
  })
})