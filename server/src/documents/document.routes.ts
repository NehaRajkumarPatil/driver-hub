import { DocumentType, UserRole } from '@prisma/client'
import { Router } from 'express'
import multer from 'multer'
import { AppError } from '../lib/http.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody, validateParams } from '../middleware/validate.js'
import { documentSchema, uuidParamSchema } from '../driver/driver.schemas.js'
import {
  deleteDocumentController,
  listDocumentsController,
  uploadDocumentController,
} from './document.controller.js'

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Upload a PDF, DOC, DOCX, JPG, or PNG file'))
      return
    }
    callback(null, true)
  },
})

export const documentRouter = Router()
documentRouter.use(requireAuth, requireRole(UserRole.DRIVER))
documentRouter.get('/', listDocumentsController)
documentRouter.post('/', upload.single('file'), validateBody(documentSchema), uploadDocumentController)
documentRouter.delete('/:id', validateParams(uuidParamSchema), deleteDocumentController)

export const documentTypeValues = Object.values(DocumentType)