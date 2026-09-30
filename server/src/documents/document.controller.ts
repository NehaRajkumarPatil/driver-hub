import type { RequestHandler } from 'express'
import { DocumentType } from '@prisma/client'
import { env } from '../config/env.js'
import { AppError, asyncHandler } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { removeStoredDocument, storeDocument } from '../lib/storage.js'

export const uploadDocumentController: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.file) throw new AppError(400, 'FILE_REQUIRED', 'A document file is required in field "file"')
  const stored = await storeDocument(request.file, env.uploadDir)

  try {
    const document = await prisma.document.create({
      data: {
        userId: request.auth!.userId,
        type: request.body.type as DocumentType,
        fileUrl: stored.fileUrl,
        fileName: request.file.originalname,
      },
    })
    response.status(201).json({ data: { document } })
  } catch (error) {
    await removeStoredDocument(stored.fileUrl, env.uploadDir)
    throw error
  }
})

export const listDocumentsController: RequestHandler = asyncHandler(async (request, response) => {
  const documents = await prisma.document.findMany({
    where: { userId: request.auth!.userId },
    orderBy: { uploadedAt: 'desc' },
  })
  response.status(200).json({ data: { documents } })
})

export const deleteDocumentController: RequestHandler = asyncHandler(async (request, response) => {
  const document = await prisma.document.findFirst({
    where: { id: request.params.id, userId: request.auth!.userId },
  })
  if (!document) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document was not found')

  await prisma.document.delete({ where: { id: document.id } })
  await removeStoredDocument(document.fileUrl, env.uploadDir)
  response.status(204).send()
})