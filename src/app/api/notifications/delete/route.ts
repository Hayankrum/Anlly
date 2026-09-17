import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterSessao } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const usuario = await obterSessao()
    if (!usuario) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id, all } = await request.json()

    if (all) {
      await prisma.notificacao.deleteMany({
        where: {
          usuarioId: usuario.id,
        },
      })
    } else if (id) {
      await prisma.notificacao.deleteMany({
        where: {
          id,
          usuarioId: usuario.id,
        },
      })
    } else {
      return NextResponse.json({ error: 'Parâmetro inválido' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Delete Notification] Error:', error)
    return NextResponse.json({ error: 'Erro ao excluir notificação' }, { status: 500 })
  }
}