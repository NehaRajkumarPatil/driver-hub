import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/http.js'
import type { DriverExperienceInput, DriverProfileInput } from './driver.schemas.js'

export const getDriverProfile = (userId: string) =>
  prisma.driverProfile.findUniqueOrThrow({
    where: { userId },
    include: {
      experiences: { orderBy: { id: 'asc' } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  })

export const updateDriverProfile = (userId: string, input: DriverProfileInput) =>
  prisma.driverProfile.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
    include: {
      experiences: { orderBy: { id: 'asc' } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  })

export const listDriverExperience = (driverId: string) =>
  prisma.driverExperience.findMany({ where: { driverId }, orderBy: { id: 'asc' } })

export const createDriverExperience = (driverId: string, input: DriverExperienceInput) =>
  prisma.driverExperience.create({ data: { driverId, ...input } })

const requireOwnedExperience = async (driverId: string, id: string) => {
  const experience = await prisma.driverExperience.findFirst({ where: { id, driverId } })
  if (!experience) throw new AppError(404, 'EXPERIENCE_NOT_FOUND', 'Driving experience was not found')
  return experience
}

export const updateDriverExperience = async (
  driverId: string,
  id: string,
  input: Partial<DriverExperienceInput>,
) => {
  await requireOwnedExperience(driverId, id)
  return prisma.driverExperience.update({ where: { id }, data: input })
}

export const deleteDriverExperience = async (driverId: string, id: string) => {
  await requireOwnedExperience(driverId, id)
  await prisma.driverExperience.delete({ where: { id } })
}