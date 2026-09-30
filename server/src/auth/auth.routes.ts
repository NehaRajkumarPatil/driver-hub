import { Router } from 'express'
import { UserRole } from '@prisma/client'
import { loginController, meController, registerController } from './auth.controller.js'
import { loginSchema, registerSchema } from './auth.schemas.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

export const authRouter = Router()

authRouter.post('/register', validateBody(registerSchema), registerController)
authRouter.post('/login', validateBody(loginSchema), loginController)
authRouter.get('/me', requireAuth, requireRole(UserRole.DRIVER, UserRole.EMPLOYER, UserRole.ADMIN), meController)