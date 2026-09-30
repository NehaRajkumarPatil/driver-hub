import { DriverCategory } from '@prisma/client'
import { z } from 'zod'

export const jobQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  category: z.nativeEnum(DriverCategory).optional(),
  location: z.string().trim().max(160).optional(),
  minSalary: z.coerce.number().min(0).optional(),
  experience: z.coerce.number().min(0).max(70).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const applySchema = z.object({
  coverNote: z.string().trim().max(4000).optional(),
})

export const jobIdParamSchema = z.object({ id: z.string().uuid() })

export type JobQuery = z.infer<typeof jobQuerySchema>