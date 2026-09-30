import { z } from 'zod'

const optionalDate = z.coerce.date().nullable().optional()

export const driverProfileSchema = z.object({
  location: z.string().trim().max(160).nullable().optional(),
  dob: optionalDate,
  bio: z.string().trim().max(4000).nullable().optional(),
  licenseType: z.string().trim().max(80).nullable().optional(),
  licenseNumber: z.string().trim().max(100).nullable().optional(),
  licenseExpiry: optionalDate,
  totalExperienceYears: z.coerce.number().min(0).max(70).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  preferredCategories: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  expectedSalary: z.coerce.number().min(0).max(10000000).nullable().optional(),
  availability: z.string().trim().max(120).nullable().optional(),
  isProfilePublic: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one profile field is required')

export const driverExperienceSchema = z.object({
  vehicleType: z.string().trim().min(1).max(100),
  employerName: z.string().trim().min(1).max(160),
  years: z.coerce.number().min(0).max(70),
  notes: z.string().trim().max(2000).nullable().optional(),
})

export const driverExperienceUpdateSchema = driverExperienceSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one experience field is required')

export const documentSchema = z.object({
  type: z.enum(['RESUME', 'LICENSE', 'ID_PROOF', 'OTHER']),
})

export const uuidParamSchema = z.object({ id: z.string().uuid() })

export type DriverProfileInput = z.infer<typeof driverProfileSchema>
export type DriverExperienceInput = z.infer<typeof driverExperienceSchema>