import { ApplicationStatus, JobStatus, NotificationType, Prisma } from '@prisma/client'
import { AppError } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import type { JobQuery } from './job.schemas.js'

const publicJobInclude = {
  employer: { select: { companyName: true, industry: true, location: true, website: true, verified: true } },
} satisfies Prisma.JobInclude

export const listApprovedJobs = async (query: JobQuery) => {
  const and: Prisma.JobWhereInput[] = []
  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
        { employer: { companyName: { contains: query.q, mode: 'insensitive' } } },
      ],
    })
  }
  if (query.location) and.push({ location: { contains: query.location, mode: 'insensitive' } })
  if (query.minSalary !== undefined) {
    and.push({ OR: [{ salaryMax: { gte: query.minSalary } }, { salaryMax: null }] })
  }
  if (query.experience !== undefined) and.push({ experienceRequired: { lte: query.experience } })

  const where: Prisma.JobWhereInput = {
    status: JobStatus.APPROVED,
    ...(query.category ? { driverCategory: query.category } : {}),
    ...(and.length ? { AND: and } : {}),
  }
  const skip = (query.page - 1) * query.limit
  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({ where, include: publicJobInclude, orderBy: { createdAt: 'desc' }, skip, take: query.limit }),
    prisma.job.count({ where }),
  ])

  return { jobs, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }
}

export const getApprovedJob = async (id: string) => {
  const job = await prisma.job.findFirst({ where: { id, status: JobStatus.APPROVED }, include: publicJobInclude })
  if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job was not found')
  return job
}

export const applyToApprovedJob = (jobId: string, driverId: string, coverNote?: string) =>
  prisma.$transaction(async (transaction) => {
    const job = await transaction.job.findFirst({
      where: { id: jobId, status: JobStatus.APPROVED },
      select: { id: true, title: true, employerId: true },
    })
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job was not found')

    const application = await transaction.application.create({
      data: { jobId: job.id, driverId, coverNote, status: ApplicationStatus.APPLIED },
    })
    await transaction.notification.create({
      data: {
        userId: job.employerId,
        type: NotificationType.APPLICATION_RECEIVED,
        title: 'New job application',
        message: `A driver applied for ${job.title}`,
        link: `/employer/jobs/${job.id}/applications`,
      },
    })
    return application
  })

export const listDriverApplications = (driverId: string) =>
  prisma.application.findMany({
    where: { driverId },
    include: {
      job: { include: publicJobInclude },
    },
    orderBy: { createdAt: 'desc' },
  })

export const saveApprovedJob = async (driverId: string, jobId: string) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, status: JobStatus.APPROVED }, select: { id: true } })
  if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job was not found')
  return prisma.savedJob.upsert({
    where: { driverId_jobId: { driverId, jobId } },
    create: { driverId, jobId },
    update: {},
  })
}

export const unsaveJob = async (driverId: string, jobId: string) => {
  await prisma.savedJob.deleteMany({ where: { driverId, jobId } })
}

export const listSavedJobs = (driverId: string) =>
  prisma.savedJob.findMany({
    where: { driverId, job: { status: JobStatus.APPROVED } },
    include: { job: { include: publicJobInclude } },
    orderBy: { createdAt: 'desc' },
  })