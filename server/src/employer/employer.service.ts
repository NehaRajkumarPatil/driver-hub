import {
  ApplicationStatus,
  DriverCategory,
  JobStatus,
  NotificationType,
  Prisma,
} from '@prisma/client'
import { AppError } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { createNotification } from '../notifications/notification.service.js'
import type {
  EmployerDriversQuery,
  EmployerJobInput,
  EmployerProfileInput,
} from './employer.schemas.js'

export const getEmployerProfile = async (userId: string) => {
  const profile = await prisma.employerProfile.findUnique({ where: { userId } })
  if (!profile) throw new AppError(404, 'EMPLOYER_PROFILE_NOT_FOUND', 'Employer profile was not found')
  return profile
}

export const updateEmployerProfile = (userId: string, input: EmployerProfileInput) =>
  prisma.employerProfile.update({ where: { userId }, data: input })

const requireOwnedJob = async (employerId: string, jobId: string) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, employerId } })
  if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job was not found')
  return job
}

export const createEmployerJob = (employerId: string, input: EmployerJobInput) =>
  prisma.job.create({
    data: {
      employerId,
      ...input,
      status: JobStatus.PENDING,
    },
  })

export const listEmployerJobs = (employerId: string) =>
  prisma.job.findMany({
    where: { employerId },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: 'desc' },
  })

export const updateEmployerJob = async (
  employerId: string,
  jobId: string,
  input: Partial<EmployerJobInput>,
) => {
  await requireOwnedJob(employerId, jobId)
  return prisma.job.update({
    where: { id: jobId },
    data: { ...input, status: JobStatus.PENDING },
  })
}

export const deleteEmployerJob = async (employerId: string, jobId: string) => {
  const result = await prisma.job.deleteMany({ where: { id: jobId, employerId } })
  if (result.count === 0) throw new AppError(404, 'JOB_NOT_FOUND', 'Job was not found')
}

export const listJobApplications = async (employerId: string, jobId: string) => {
  await requireOwnedJob(employerId, jobId)
  return prisma.application.findMany({
    where: { jobId },
    include: {
      driver: {
        select: {
          userId: true,
          location: true,
          bio: true,
          licenseType: true,
          totalExperienceYears: true,
          skills: true,
          preferredCategories: true,
          availability: true,
          experiences: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export const updateApplicationStatus = async (
  employerId: string,
  applicationId: string,
  status: ApplicationStatus,
) => {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, job: { employerId } },
    include: { job: { select: { id: true, title: true } } },
  })
  if (!application) throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application was not found')
  const updated = await prisma.application.update({ where: { id: applicationId }, data: { status } })

  if (application.status !== status) {
    await createNotification({
      userId: application.driverId,
      type: NotificationType.APPLICATION_STATUS,
      title: `Application ${status.toLowerCase()}`,
      message: `Your application for ${application.job.title} is now ${status.toLowerCase()}.`,
      link: '/applications/me',
    })
  }
  return updated
}

export const getShortlistedContact = async (employerId: string, applicationId: string) => {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, job: { employerId } },
    select: {
      status: true,
      driver: { select: { user: { select: { name: true, email: true, phone: true } } } },
    },
  })
  if (!application) throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application was not found')
  if (application.status !== ApplicationStatus.SHORTLISTED) {
    throw new AppError(403, 'CONTACT_REQUIRES_SHORTLIST', 'Contact details are available after shortlisting')
  }
  return application.driver.user
}

export const searchPublicDrivers = async (query: EmployerDriversQuery) => {
  const filters: Prisma.DriverProfileWhereInput[] = []
  if (query.location) filters.push({ location: { contains: query.location, mode: 'insensitive' } })
  if (query.category) filters.push({ preferredCategories: { has: query.category as DriverCategory } })
  if (query.minExperience !== undefined) filters.push({ totalExperienceYears: { gte: query.minExperience } })
  if (query.q) {
    filters.push({
      OR: [
        { bio: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
        { licenseType: { contains: query.q, mode: 'insensitive' } },
        { skills: { has: query.q } },
        { user: { name: { contains: query.q, mode: 'insensitive' } } },
      ],
    })
  }
  const where: Prisma.DriverProfileWhereInput = {
    isProfilePublic: true,
    ...(filters.length ? { AND: filters } : {}),
  }
  const skip = (query.page - 1) * query.limit
  const [drivers, total] = await prisma.$transaction([
    prisma.driverProfile.findMany({
      where,
      select: {
        userId: true,
        location: true,
        bio: true,
        licenseType: true,
        totalExperienceYears: true,
        skills: true,
        preferredCategories: true,
        availability: true,
        experiences: true,
        user: { select: { name: true } },
      },
      orderBy: { totalExperienceYears: 'desc' },
      skip,
      take: query.limit,
    }),
    prisma.driverProfile.count({ where }),
  ])
  return { drivers, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }
}