import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { myApplicationsController, savedJobsController } from './job.controller.js'

export const driverApplicationRouter = Router()
driverApplicationRouter.get('/me', requireAuth, requireRole(UserRole.DRIVER), myApplicationsController)

export const savedJobsRouter = Router()
savedJobsRouter.get('/', requireAuth, requireRole(UserRole.DRIVER), savedJobsController)