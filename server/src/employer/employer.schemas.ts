import { ApplicationStatus, DriverCategory } from '@prisma/client'
import { z } from 'zod'

export const employerProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(160).optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  location: z.string().trim().max(160).nullable().optional(),
  website: z.string().trim().url().max(500).nullable().optional(),
  logoUrl: z.string().trim().url().max(1000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one company field is required')

export type EmployerProfileInput = z.infer<typeof employerProfileSchema>

const jobFields = {
  title: z.string().trim().min(3).max(160),
  driverCategory: z.nativeEnum(DriverCategory),
  description: z.string().trim().min(20).max(10000),
  location: z.string().trim().min(2).max(160),
  salaryMin: z.coerce.number().min(0).max(10000000).nullable().optional(),
  salaryMax: z.coerce.number().min(0).max(10000000).nullable().optional(),
  experienceRequired: z.coerce.number().min(0).max(70).default(0),
  workingHours: z.string().trim().max(160).nullable().optional(),
  requiredDocuments: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  vacancies: z.coerce.number().int().positive().max(10000).default(1),
}

const salaryRangeIsValid = (value: { salaryMin?: number | null; salaryMax?: number | null }) =>
  value.salaryMin == null || value.salaryMax == null || value.salaryMin <= value.salaryMax

export const createEmployerJobSchema = z.object(jobFields).refine(salaryRangeIsValid, {
  message: 'salaryMin must not exceed salaryMax',
  path: ['salaryMax'],
})

export const updateEmployerJobSchema = z.object(jobFields).partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one job field is required')
  .refine(salaryRangeIsValid, { message: 'salaryMin must not exceed salaryMax', path: ['salaryMax'] })

export const employerDriversQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  location: z.string().trim().max(160).optional(),
  category: z.nativeEnum(DriverCategory).optional(),
  minExperience: z.coerce.number().min(0).max(70).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    ApplicationStatus.VIEWED,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.HIRED,
  ]),
})

export const uuidIdSchema = z.object({ id: z.string().uuid() })
export type EmployerJobInput = z.infer<typeof createEmployerJobSchema>
export type EmployerDriversQuery = z.infer<typeof employerDriversQuerySchema>