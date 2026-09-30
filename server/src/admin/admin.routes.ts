import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js'
import {
  adminApplicationsQuerySchema,
  adminIdParamSchema,
  adminJobStatusSchema,
  adminJobsQuerySchema,
  adminUserStatusSchema,
  adminUsersQuerySchema,
} from './admin.schemas.js'
import {
  listApplicationsController,
  listJobsController,
  listUsersController,
  statsController,
  updateJobStatusController,
  updateUserStatusController,
} from './admin.controller.js'

export const adminRouter = Router()
adminRouter.use(requireAuth, requireRole(UserRole.ADMIN))
adminRouter.get('/stats', statsController)
adminRouter.get('/users', validateQuery(adminUsersQuerySchema), listUsersController)
adminRouter.patch('/users/:id/status', validateParams(adminIdParamSchema), validateBody(adminUserStatusSchema), updateUserStatusController)
adminRouter.get('/jobs', validateQuery(adminJobsQuerySchema), listJobsController)
adminRouter.patch('/jobs/:id/status', validateParams(adminIdParamSchema), validateBody(adminJobStatusSchema), updateJobStatusController)
adminRouter.get('/applications', validateQuery(adminApplicationsQuerySchema), listApplicationsController)