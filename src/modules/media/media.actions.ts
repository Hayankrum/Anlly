'use server'

import { mediaService } from './media.service'
import { obterSessao } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export interface UploadResult {
  success: boolean
  data?: {
    id: string
    url: string
    filename: string
  }
  error?: string
}

export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  try {
    const sessao = await obterSessao()
    if (!sessao?.id) {
      return { success: false, error: 'Não autorizado' }
    }

    const file = formData.get('file') as File | null
    if (!file) {
      return { success: false, error: 'Nenhum arquivo enviado' }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await mediaService.upload({
      ownerId: sessao.id,
      file: buffer,
      filename: file.name,
      originalName: file.name,
      mimeType: file.type,
    })

    return {
      success: true,
      data: {
        id: result.id,
        url: result.url,
        filename: result.filename,
      },
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao fazer upload',
    }
  }
}

export async function deleteMedia(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sessao = await obterSessao()
    if (!sessao?.id) {
      return { success: false, error: 'Não autorizado' }
    }

    const media = await prisma.media.findUnique({
      where: { id },
    })

    if (!media) {
      return { success: false, error: 'Media não encontrada' }
    }

    if (media.ownerId !== sessao.id) {
      return { success: false, error: 'Não autorizado' }
    }

    await mediaService.delete(id)

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar',
    }
  }
}

export async function getUserMedia(): Promise<{
  success: boolean
  data?: Array<{ id: string; url: string; filename: string; mimeType: string }>
  error?: string
}> {
  try {
    const sessao = await obterSessao()
    if (!sessao?.id) {
      return { success: false, error: 'Não autorizado' }
    }

    const medias = await mediaService.getByOwnerId(sessao.id)

    return {
      success: true,
      data: medias.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        mimeType: m.mimeType,
      })),
    }
  } catch (error) {
    console.error('Get user media error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar mídias',
    }
  }
}
