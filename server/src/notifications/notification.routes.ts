import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validateParams } from '../middleware/validate.js'
import {
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from './notification.controller.js'
import { notificationIdSchema } from './notification.schemas.js'

export const notificationRouter = Router()
notificationRouter.use(requireAuth)
notificationRouter.get('/', listNotificationsController)
notificationRouter.patch('/read-all', markAllNotificationsReadController)
notificationRouter.patch('/:id/read', validateParams(notificationIdSchema), markNotificationReadController)