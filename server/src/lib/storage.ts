import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import type { Express } from 'express'

const safeExtension = (fileName: string) => {
  const extension = extname(fileName).toLowerCase()
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : ''
}

export const storeDocument = async (file: Express.Multer.File, uploadDirectory: string) => {
  const directory = resolve(uploadDirectory)
  await mkdir(directory, { recursive: true })
  const fileName = `${randomUUID()}${safeExtension(file.originalname)}`
  const path = join(directory, fileName)
  await writeFile(path, file.buffer, { flag: 'wx' })
  return { fileName, fileUrl: `/uploads/${fileName}`, storageKey: path }
}

export const removeStoredDocument = async (fileUrl: string, uploadDirectory: string) => {
  const fileName = fileUrl.split('/').at(-1)
  if (!fileName || fileName !== fileUrl.slice('/uploads/'.length) || fileUrl.includes('..')) return
  await unlink(join(resolve(uploadDirectory), fileName)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}