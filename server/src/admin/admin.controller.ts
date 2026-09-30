import type { RequestHandler } from 'express'
import { asyncHandler } from '../lib/http.js'
import {
  getAdminStats,
  listAdminApplications,
  listAdminJobs,
  listAdminUsers,
  updateAdminJobStatus,
  updateAdminUserStatus,
} from './admin.service.js'

export const statsController: RequestHandler = asyncHandler(async (_request, response) => {
  const stats = await getAdminStats()
  response.status(200).json({ data: { stats } })
})

export const listUsersController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await listAdminUsers(request.query as never)
  response.status(200).json({ data: result })
})

export const updateUserStatusController: RequestHandler = asyncHandler(async (request, response) => {
  const user = await updateAdminUserStatus(request.params.id!, request.body.status)
  response.status(200).json({ data: { user } })
})

export const listJobsController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await listAdminJobs(request.query as never)
  response.status(200).json({ data: result })
})

export const updateJobStatusController: RequestHandler = asyncHandler(async (request, response) => {
  const job = await updateAdminJobStatus(request.params.id!, request.body.status)
  response.status(200).json({ data: { job } })
})

export const listApplicationsController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await listAdminApplications(request.query as never)
  response.status(200).json({ data: result })
})