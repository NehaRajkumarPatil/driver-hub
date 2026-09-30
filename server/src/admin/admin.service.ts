import {
  ApplicationStatus,
  DriverCategory,
  JobStatus,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client'
import { AppError } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { notifyMatchingDriversForApprovedJob } from '../notifications/notification.service.js'
import type {
  AdminApplicationsQuery,
  AdminJobsQuery,
  AdminUsersQuery,
} from './admin.schemas.js'

export const getAdminStats = async () => {
  const [users, jobs, applications] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.application.count(),
  ])

  const userCounts = Object.fromEntries(users.map(({ role, _count }) => [role, _count._all]))
  const jobCounts = Object.fromEntries(jobs.map(({ status, _count }) => [status, _count._all]))

  return {
    users: {
      total: Object.values(userCounts).reduce((sum, count) => sum + count, 0),
      drivers: userCounts[UserRole.DRIVER] ?? 0,
      employers: userCounts[UserRole.EMPLOYER] ?? 0,
      admins: userCounts[UserRole.ADMIN] ?? 0,
    },
    jobs: {
      total: Object.values(jobCounts).reduce((sum, count) => sum + count, 0),
      pending: jobCounts[JobStatus.PENDING] ?? 0,
      approved: jobCounts[JobStatus.APPROVED] ?? 0,
      rejected: jobCounts[JobStatus.REJECTED] ?? 0,
      blocked: jobCounts[JobStatus.BLOCKED] ?? 0,
      closed: jobCounts[JobStatus.CLOSED] ?? 0,
    },
    applications,
  }
}

export const listAdminUsers = async (query: AdminUsersQuery) => {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? {
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ],
    } : {}),
  }
  const skip = (query.page - 1) * query.limit
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        driverProfile: { select: { location: true, isProfilePublic: true } },
        employerProfile: { select: { companyName: true, verified: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ])
  return { users, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }
}

export const updateAdminUserStatus = async (id: string, status: UserStatus) => {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found')
  if (user.role === UserRole.ADMIN && status === UserStatus.BLOCKED) {
    throw new AppError(400, 'ADMIN_CANNOT_BE_BLOCKED', 'Admin accounts cannot be blocked through this endpoint')
  }
  return prisma.user.update({
    where: { id },
    data: { status },
    select: { id: true, name: true, email: true, role: true, status: true },
  })
}

export const listAdminJobs = async (query: AdminJobsQuery) => {
  const where: Prisma.JobWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { driverCategory: query.category as DriverCategory } : {}),
    ...(query.q ? {
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
        { employer: { companyName: { contains: query.q, mode: 'insensitive' } } },
      ],
    } : {}),
  }
  const skip = (query.page - 1) * query.limit
  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      include: {
        employer: { select: { companyName: true, verified: true, user: { select: { email: true } } } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
    }),
    prisma.job.count({ where }),
  ])
  return { jobs, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }
}

export const updateAdminJobStatus = async (jobId: string, status: JobStatus) => {
  return prisma.$transaction(async (transaction) => {
    const job = await transaction.job.findUnique({
      where: { id: jobId },
      include: { employer: { select: { companyName: true } } },
    })
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job was not found')

    const transition = await transaction.job.updateMany({
      where: { id: jobId, status: { not: status } },
      data: { status },
    })
    const updated = await transaction.job.findUnique({ where: { id: jobId } })

    if (status === JobStatus.APPROVED && job.status !== JobStatus.APPROVED && transition.count > 0) {
      await transaction.notification.create({
        data: {
          userId: job.employerId,
          type: NotificationType.JOB_APPROVED,
          title: 'Your job posting was approved',
          message: `${job.title} is now visible to drivers.`,
          link: `/employer/jobs/${job.id}`,
        },
      })

      await notifyMatchingDriversForApprovedJob(transaction, job)
    }
    return updated!
  })
}

export const listAdminApplications = async (query: AdminApplicationsQuery) => {
  const where: Prisma.ApplicationWhereInput = query.status ? { status: query.status as ApplicationStatus } : {}
  const skip = (query.page - 1) * query.limit
  const [applications, total] = await prisma.$transaction([
    prisma.application.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, location: true, employer: { select: { companyName: true } } } },
        driver: { select: { userId: true, user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
    }),
    prisma.application.count({ where }),
  ])
  return { applications, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }
}