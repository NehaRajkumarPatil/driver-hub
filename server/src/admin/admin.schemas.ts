import { ApplicationStatus, DriverCategory, JobStatus, UserRole, UserStatus } from '@prisma/client'
import { z } from 'zod'

export const adminUsersQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  q: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
})

export const adminJobsQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  category: z.nativeEnum(DriverCategory).optional(),
  q: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
})

export const adminApplicationsQuerySchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
})

export const adminUserStatusSchema = z.object({ status: z.nativeEnum(UserStatus) })
export const adminJobStatusSchema = z.object({
  status: z.enum([JobStatus.APPROVED, JobStatus.REJECTED, JobStatus.BLOCKED]),
})
export const adminIdParamSchema = z.object({ id: z.string().uuid() })

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>
export type AdminJobsQuery = z.infer<typeof adminJobsQuerySchema>
export type AdminApplicationsQuery = z.infer<typeof adminApplicationsQuerySchema>