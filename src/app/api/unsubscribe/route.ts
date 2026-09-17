import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterSessao } from '@/lib/session'
import { rateLimit, getRateLimitKey } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const rlKey = getRateLimitKey(request, 'unsubscribe')
    const rl = rateLimit(rlKey, { windowMs: 60_000, max: 10 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 })
    }

    const usuario = await obterSessao()
    if (!usuario) {
      console.log('[Unsubscribe] Unauthorized attempt')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { endpoint } = await request.json()

    if (!endpoint || typeof endpoint !== 'string') {
      console.log('[Unsubscribe] Invalid endpoint')
      return NextResponse.json({ error: 'Endpoint inválido' }, { status: 400 })
    }

    console.log('[Unsubscribe] User', usuario.id, 'unsubscribing endpoint:', endpoint.substring(0, 50) + '...')

    const result = await prisma.inscricaoPush.deleteMany({
      where: {
        endpoint,
        usuarioId: usuario.id,
      },
    })

    console.log('[Unsubscribe] Deleted', result.count, 'subscription(s)')
    return NextResponse.json({ message: 'Desinscrito com sucesso' })
  } catch (error) {
    console.error('[Unsubscribe] Error:', error)
    return NextResponse.json({ error: 'Erro ao desinscrever' }, { status: 500 })
  }
}
