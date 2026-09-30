import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js'
import {
  createEmployerJobController,
  deleteEmployerJobController,
  getApplicationContactController,
  getEmployerProfileController,
  listEmployerJobsController,
  listJobApplicationsController,
  patchApplicationStatusController,
  putEmployerJobController,
  putEmployerProfileController,
  searchDriversController,
} from './employer.controller.js'
import {
  createEmployerJobSchema,
  employerDriversQuerySchema,
  employerProfileSchema,
  updateApplicationStatusSchema,
  updateEmployerJobSchema,
  uuidIdSchema,
} from './employer.schemas.js'

export const employerRouter = Router()
employerRouter.use(requireAuth, requireRole(UserRole.EMPLOYER))
employerRouter.get('/profile', getEmployerProfileController)
employerRouter.put('/profile', validateBody(employerProfileSchema), putEmployerProfileController)
employerRouter.get('/jobs', listEmployerJobsController)
employerRouter.post('/jobs', validateBody(createEmployerJobSchema), createEmployerJobController)
employerRouter.put('/jobs/:id', validateParams(uuidIdSchema), validateBody(updateEmployerJobSchema), putEmployerJobController)
employerRouter.delete('/jobs/:id', validateParams(uuidIdSchema), deleteEmployerJobController)
employerRouter.get('/jobs/:id/applications', validateParams(uuidIdSchema), listJobApplicationsController)
employerRouter.get('/applications/:id/contact', validateParams(uuidIdSchema), getApplicationContactController)
employerRouter.get('/drivers', validateQuery(employerDriversQuerySchema), searchDriversController)

export const employerApplicationRouter = Router()
employerApplicationRouter.patch('/:id/status', requireAuth, requireRole(UserRole.EMPLOYER), validateParams(uuidIdSchema), validateBody(updateApplicationStatusSchema), patchApplicationStatusController)