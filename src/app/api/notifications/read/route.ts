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
      await prisma.notificacao.updateMany({
        where: {
          usuarioId: usuario.id,
          lida: false,
        },
        data: { lida: true },
      })
    } else if (id) {
      await prisma.notificacao.updateMany({
        where: {
          id,
          usuarioId: usuario.id,
        },
        data: { lida: true },
      })
    } else {
      return NextResponse.json({ error: 'Parâmetro inválido' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Mark Read] Error:', error)
    return NextResponse.json({ error: 'Erro ao marcar como lida' }, { status: 500 })
  }
}
