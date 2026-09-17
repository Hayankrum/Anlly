import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterSessao } from '@/lib/session'

export async function GET() {
  try {
    const usuario = await obterSessao()
    if (!usuario) {
      return NextResponse.json({ count: 0 })
    }

    const count = await prisma.notificacao.count({
      where: {
        usuarioId: usuario.id,
        lida: false,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('[Unread Notifications] Error:', error)
    return NextResponse.json({ count: 0 })
  }
}
