import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { asyncHandler } from '../lib/http.js'

export const validateBody = (schema: ZodType): RequestHandler =>
  asyncHandler((request, _response, next) => {
    request.body = schema.parse(request.body)
    next()
  })