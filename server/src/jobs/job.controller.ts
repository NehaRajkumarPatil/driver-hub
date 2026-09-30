import type { RequestHandler } from 'express'
import { asyncHandler } from '../lib/http.js'
import type { JobQuery } from './job.schemas.js'
import {
  applyToApprovedJob,
  getApprovedJob,
  listApprovedJobs,
  listDriverApplications,
  listSavedJobs,
  saveApprovedJob,
  unsaveJob,
} from './job.service.js'

export const listJobsController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await listApprovedJobs(request.query as unknown as JobQuery)
  response.status(200).json({ data: result })
})

export const getJobController: RequestHandler = asyncHandler(async (request, response) => {
  const job = await getApprovedJob(request.params.id!)
  response.status(200).json({ data: { job } })
})

export const applyController: RequestHandler = asyncHandler(async (request, response) => {
  const application = await applyToApprovedJob(request.params.id!, request.auth!.userId, request.body.coverNote)
  response.status(201).json({ data: { application } })
})

export const myApplicationsController: RequestHandler = asyncHandler(async (request, response) => {
  const applications = await listDriverApplications(request.auth!.userId)
  response.status(200).json({ data: { applications } })
})

export const saveJobController: RequestHandler = asyncHandler(async (request, response) => {
  const savedJob = await saveApprovedJob(request.auth!.userId, request.params.id!)
  response.status(201).json({ data: { savedJob } })
})

export const unsaveJobController: RequestHandler = asyncHandler(async (request, response) => {
  await unsaveJob(request.auth!.userId, request.params.id!)
  response.status(204).send()
})

export const savedJobsController: RequestHandler = asyncHandler(async (request, response) => {
  const savedJobs = await listSavedJobs(request.auth!.userId)
  response.status(200).json({ data: { savedJobs } })
})