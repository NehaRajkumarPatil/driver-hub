import { NotificationType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

type NotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export const createNotification = (input: NotificationInput) =>
  prisma.notification.create({ data: input })

export const notifyMatchingDriversForJob = async (jobId: string) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { employer: true },
  })
  if (!job || job.status !== 'APPROVED') return

  const drivers = await prisma.driverProfile.findMany({
    where: {
      isProfilePublic: true,
      OR: [
        { preferredCategories: { has: job.driverCategory } },
        { location: { equals: job.location, mode: 'insensitive' } },
      ],
    },
    select: { userId: true },
  })

  if (drivers.length === 0) return

  await prisma.notification.createMany({
    data: drivers.map(({ userId }) => ({
      userId,
      type: NotificationType.MATCHED_JOB,
      title: 'A new job matches your profile',
      message: `${job.title} at ${job.employer.companyName} in ${job.location}`,
      link: `/jobs/${job.id}`,
    })),
    skipDuplicates: true,
  })
}