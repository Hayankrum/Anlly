import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Rota indisponível em produção' }, { status: 403 })
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        notificacoesAtivas: true,
        notificarSistema: true,
        inscricoes: {
          select: {
            id: true,
            endpoint: true,
            criadoEm: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json({ usuarios })
  } catch (error) {
    console.error('[List Users] Error:', error)
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 })
  }
}
