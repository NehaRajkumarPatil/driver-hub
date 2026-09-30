import { z } from 'zod'

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase())

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8).max(72),
  role: z.enum(['DRIVER', 'EMPLOYER']),
  companyName: z.string().trim().min(2).max(160).optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>