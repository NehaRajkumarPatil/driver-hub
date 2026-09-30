import type { RequestHandler } from 'express'
import { asyncHandler } from '../lib/http.js'
import { getCurrentUser, login, register } from './auth.service.js'

export const registerController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await register(request.body)
  response.status(201).json({ data: result })
})

export const loginController: RequestHandler = asyncHandler(async (request, response) => {
  const result = await login(request.body)
  response.status(200).json({ data: result })
})

export const meController: RequestHandler = asyncHandler(async (request, response) => {
  const user = await getCurrentUser(request.auth!.userId)
  response.status(200).json({ data: { user } })
})