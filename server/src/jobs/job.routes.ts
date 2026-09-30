import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js'
import {
  applyController,
  getJobController,
  listJobsController,
  saveJobController,
  unsaveJobController,
} from './job.controller.js'
import { applySchema, jobIdParamSchema, jobQuerySchema } from './job.schemas.js'

export const jobRouter = Router()
jobRouter.get('/', validateQuery(jobQuerySchema), listJobsController)
jobRouter.get('/:id', validateParams(jobIdParamSchema), getJobController)
jobRouter.post('/:id/apply', requireAuth, requireRole(UserRole.DRIVER), validateParams(jobIdParamSchema), validateBody(applySchema), applyController)
jobRouter.post('/:id/save', requireAuth, requireRole(UserRole.DRIVER), validateParams(jobIdParamSchema), saveJobController)
jobRouter.delete('/:id/save', requireAuth, requireRole(UserRole.DRIVER), validateParams(jobIdParamSchema), unsaveJobController)