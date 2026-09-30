import bcrypt from 'bcrypt'
import { Prisma, UserRole, UserStatus } from '@prisma/client'
import { AppError } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { signAccessToken } from '../middleware/auth.js'
import type { LoginInput, RegisterInput } from './auth.schemas.js'

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  driverProfile: {
    select: {
      location: true,
      bio: true,
      licenseType: true,
      totalExperienceYears: true,
      skills: true,
      preferredCategories: true,
      availability: true,
      isProfilePublic: true,
    },
  },
  employerProfile: {
    select: {
      companyName: true,
      industry: true,
      description: true,
      location: true,
      website: true,
      logoUrl: true,
      verified: true,
    },
  },
} satisfies Prisma.UserSelect

const issueToken = (user: { id: string; role: UserRole }) => ({
  accessToken: signAccessToken({ userId: user.id, role: user.role }),
})

export const register = async (input: RegisterInput) => {
  const passwordHash = await bcrypt.hash(input.password, 12)

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: input.role as UserRole,
        ...(input.role === 'DRIVER'
          ? { driverProfile: { create: {} } }
          : { employerProfile: { create: { companyName: input.companyName ?? input.name } } }),
      },
      select: publicUserSelect,
    })

    return { user, ...issueToken(user) }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists')
    }
    throw error
  }
}

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect')
  }
  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked')
  }

  const publicUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: publicUserSelect,
  })

  return { user: publicUser, ...issueToken(user) }
}

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect })
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User account was not found')
  return user
}