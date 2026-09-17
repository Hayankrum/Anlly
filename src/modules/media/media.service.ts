import { prisma } from '@/lib/prisma'
import { getStorageProvider } from '@/infrastructure/storage'
import type { Media } from '@/generated/prisma/client'

export interface UploadMediaInput {
  ownerId: number
  file: Buffer
  filename: string
  originalName: string
  mimeType: string
}

export interface MediaResponse extends Media {
  url: string
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export class MediaService {
  private storage = getStorageProvider()

  validateFile(file: Buffer, mimeType: string): { valid: boolean; error?: string } {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return { valid: false, error: 'Tipo de arquivo não permitido' }
    }

    if (file.length > MAX_FILE_SIZE) {
      return { valid: false, error: 'Arquivo muito grande (máximo 10MB)' }
    }

    return { valid: true }
  }

  private generateStorageKey(ownerId: number, filename: string): string {
    const ext = filename.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `users/${ownerId}/${timestamp}-${random}.${ext}`
  }

  async upload(input: UploadMediaInput): Promise<MediaResponse> {
    const validation = this.validateFile(input.file, input.mimeType)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const storageKey = this.generateStorageKey(input.ownerId, input.originalName)

    const result = await this.storage.upload(storageKey, input.file, input.mimeType)

    const media = await prisma.media.create({
      data: {
        ownerId: input.ownerId,
        filename: input.filename,
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.file.length,
        storageKey: result.key,
      },
    })

    return {
      ...media,
      url: result.url,
    }
  }

  async getById(id: string): Promise<MediaResponse | null> {
    const media = await prisma.media.findUnique({
      where: { id },
    })

    if (!media) return null

    const url = await this.storage.getUrl(media.storageKey)

    return {
      ...media,
      url,
    }
  }

  async getByOwnerId(ownerId: number): Promise<MediaResponse[]> {
    const medias = await prisma.media.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    })

    const mediasWithUrls = await Promise.all(
      medias.map(async (media) => {
        const url = await this.storage.getUrl(media.storageKey)
        return { ...media, url }
      })
    )

    return mediasWithUrls
  }

  async delete(id: string): Promise<void> {
    const media = await prisma.media.findUnique({
      where: { id },
    })

    if (!media) throw new Error('Media not found')

    await this.storage.delete(media.storageKey)

    await prisma.media.delete({
      where: { id },
    })
  }

  async getSignedUrl(id: string, expiresIn?: number): Promise<string> {
    const media = await prisma.media.findUnique({
      where: { id },
    })

    if (!media) throw new Error('Media not found')

    return this.storage.getSignedUrl(media.storageKey, expiresIn)
  }
}

export const mediaService = new MediaService()
