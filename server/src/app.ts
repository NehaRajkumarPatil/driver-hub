import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { authRouter } from './auth/auth.routes.js'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './lib/http.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: env.clientOrigins }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.status(200).json({ data: { status: 'ok' } })
})

app.use('/api/auth', authRouter)
app.use(notFoundHandler)
app.use(errorHandler)