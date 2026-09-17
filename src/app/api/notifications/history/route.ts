import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterSessao } from '@/lib/session'

export async function GET() {
  try {
    const usuario = await obterSessao()
    if (!usuario) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const notificacoes = await prisma.notificacao.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { criadaEm: 'desc' },
      take: 50,
    })

    return NextResponse.json({ notificacoes })
  } catch (error) {
    console.error('[Notifications History] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 })
  }
}
