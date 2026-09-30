import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { adminRouter } from './admin/admin.routes.js'
import { authRouter } from './auth/auth.routes.js'
import { env } from './config/env.js'
import { documentRouter } from './documents/document.routes.js'
import { driverRouter } from './driver/driver.routes.js'
import { employerApplicationRouter, employerRouter } from './employer/employer.routes.js'
import { errorHandler, notFoundHandler } from './lib/http.js'
import { driverApplicationRouter, savedJobsRouter } from './jobs/application.routes.js'
import { jobRouter } from './jobs/job.routes.js'
import { notificationRouter } from './notifications/notification.routes.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: env.clientOrigins }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.status(200).json({ data: { status: 'ok' } })
})

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/driver', driverRouter)
app.use('/api/documents', documentRouter)
app.use('/api/jobs', jobRouter)
app.use('/api/applications', driverApplicationRouter)
app.use('/api/applications', employerApplicationRouter)
app.use('/api/saved-jobs', savedJobsRouter)
app.use('/api/employer', employerRouter)
app.use('/api/notifications', notificationRouter)
app.use(notFoundHandler)
app.use(errorHandler)