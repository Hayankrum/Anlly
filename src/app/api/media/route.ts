import { NextRequest, NextResponse } from 'next/server'
import { mediaService } from '@/modules/media/media.service'
import { obterSessao } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const sessao = await obterSessao()
    if (!sessao?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
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

    return NextResponse.json({
      id: result.id,
      url: result.url,
      filename: result.filename,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao fazer upload' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const sessao = await obterSessao()
    if (!sessao?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const medias = await mediaService.getByOwnerId(sessao.id)

    return NextResponse.json(
      medias.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        mimeType: m.mimeType,
      }))
    )
  } catch (error) {
    console.error('Get media error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar mídias' },
      { status: 500 }
    )
  }
}
