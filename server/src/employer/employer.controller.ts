import type { RequestHandler } from 'express'
import { asyncHandler } from '../lib/http.js'
import type { EmployerDriversQuery } from './employer.schemas.js'
import {
  createEmployerJob,
  deleteEmployerJob,
  getEmployerProfile,
  getShortlistedContact,
  listEmployerJobs,
  listJobApplications,
  searchPublicDrivers,
  updateApplicationStatus,
  updateEmployerJob,
  updateEmployerProfile,
} from './employer.service.js'

export const getEmployerProfileController: RequestHandler = asyncHandler(async (request, response) => {
  const profile = await getEmployerProfile(request.auth!.userId)
  response.status(200).json({ data: { profile } })
})

export const putEmployerProfileController: RequestHandler = asyncHandler(async (request, response) => {
  const profile = await updateEmployerProfile(request.auth!.userId, request.body)
  response.status(200).json({ data: { profile } })
})

export const createEmployerJobController: RequestHandler = asyncHandler(async (request, response) => {
  const job = await createEmployerJob(request.auth!.userId, request.body)
  response.status(201).json({ data: { job } })
})

export const listEmployerJobsController: RequestHandler = asyncHandler(async (request, response) => {
  const jobs = await listEmployerJobs(request.auth!.userId)
  response.status(200).json({ data: { jobs } })
})

export const putEmployerJobController: RequestHandler = asyncHandler(async (request, response) => {
  const job = await updateEmployerJob(request.auth!.userId, request.params.id!, request.body)
  response.status(200).json({ data: { job } })
})

export const deleteEmployerJobController: RequestHandler = asyncHandler(async (request, response) => {
  await deleteEmployerJob(request.auth!.userId, request.params.id!)
  response.status(204).send()
})

export const listJobApplicationsController: RequestHandler = asyncHandler(async (request, response) => {
  const applications = await listJobApplications(request.auth!.userId, request.params.id!)
  response.status(200).json({ data: { applications } })
})

export const patchApplicationStatusController: RequestHandler = asyncHandler(async (request, response) => {
  const application = await updateApplicationStatus(request.auth!.userId, request.params.id!, request.body.status)
  response.status(200).json({ data: { application } })
})

export const getApplicationContactController: RequestHandler = asyncHandler(async (request, response) => {
  const contact = await getShortlistedContact(request.auth!.userId, request.params.id!)
  response.status(200).json({ data: { contact } })
})

export const searchDriversController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await searchPublicDrivers(request.query as unknown as EmployerDriversQuery)
  response.status(200).json({ data: result })
})