import type { RequestHandler } from 'express'
import { asyncHandler } from '../lib/http.js'
import {
  createDriverExperience,
  deleteDriverExperience,
  getDriverProfile,
  listDriverExperience,
  updateDriverExperience,
  updateDriverProfile,
} from './driver.service.js'

export const getProfileController: RequestHandler = asyncHandler(async (request, response) => {
  const profile = await getDriverProfile(request.auth!.userId)
  response.status(200).json({ data: { profile } })
})

export const putProfileController: RequestHandler = asyncHandler(async (request, response) => {
  const profile = await updateDriverProfile(request.auth!.userId, request.body)
  response.status(200).json({ data: { profile } })
})

export const listExperienceController: RequestHandler = asyncHandler(async (request, response) => {
  const experiences = await listDriverExperience(request.auth!.userId)
  response.status(200).json({ data: { experiences } })
})

export const createExperienceController: RequestHandler = asyncHandler(async (request, response) => {
  const experience = await createDriverExperience(request.auth!.userId, request.body)
  response.status(201).json({ data: { experience } })
})

export const updateExperienceController: RequestHandler = asyncHandler(async (request, response) => {
  const experience = await updateDriverExperience(request.auth!.userId, request.params.id!, request.body)
  response.status(200).json({ data: { experience } })
})

export const deleteExperienceController: RequestHandler = asyncHandler(async (request, response) => {
  await deleteDriverExperience(request.auth!.userId, request.params.id!)
  response.status(204).send()
})