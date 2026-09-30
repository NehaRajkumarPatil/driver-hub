import type { RequestHandler } from 'express'
import { asyncHandler, AppError } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'

export const listNotificationsController: RequestHandler = asyncHandler(async (request, response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: request.auth!.userId },
    orderBy: { createdAt: 'desc' },
  })
  response.status(200).json({ data: { notifications } })
})

export const markNotificationReadController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await prisma.notification.updateMany({
    where: { id: request.params.id, userId: request.auth!.userId },
    data: { isRead: true },
  })
  if (result.count === 0) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found')
  const notification = await prisma.notification.findUniqueOrThrow({ where: { id: request.params.id } })
  response.status(200).json({ data: { notification } })
})

export const markAllNotificationsReadController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await prisma.notification.updateMany({
    where: { userId: request.auth!.userId, isRead: false },
    data: { isRead: true },
  })
  response.status(200).json({ data: { updatedCount: result.count } })
})