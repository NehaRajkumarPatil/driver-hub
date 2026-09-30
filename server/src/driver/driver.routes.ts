import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody, validateParams } from '../middleware/validate.js'
import {
  createExperienceController,
  deleteExperienceController,
  getProfileController,
  listExperienceController,
  putProfileController,
  updateExperienceController,
} from './driver.controller.js'
import {
  driverExperienceSchema,
  driverExperienceUpdateSchema,
  driverProfileSchema,
  uuidParamSchema,
} from './driver.schemas.js'

export const driverRouter = Router()
driverRouter.use(requireAuth, requireRole(UserRole.DRIVER))
driverRouter.get('/profile', getProfileController)
driverRouter.put('/profile', validateBody(driverProfileSchema), putProfileController)
driverRouter.get('/experience', listExperienceController)
driverRouter.post('/experience', validateBody(driverExperienceSchema), createExperienceController)
driverRouter.put('/experience/:id', validateParams(uuidParamSchema), validateBody(driverExperienceUpdateSchema), updateExperienceController)
driverRouter.delete('/experience/:id', validateParams(uuidParamSchema), deleteExperienceController)