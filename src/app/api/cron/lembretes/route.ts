import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { dispararLembretes } from '@/modules/eventos/lembretes.service'

export const dynamic = 'force-dynamic'

function segredoValido(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const auth = request.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const informado = bearer ?? request.headers.get('x-cron-secret')
  if (!informado) return false

  const a = Buffer.from(informado)
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

async function executar(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 })
  }

  if (!segredoValido(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const resultado = await dispararLembretes()
    return NextResponse.json({ success: true, ...resultado })
  } catch (error) {
    console.error('[Cron Lembretes] Erro:', error)
    return NextResponse.json({ error: 'Erro ao disparar lembretes' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return executar(request)
}

export async function POST(request: NextRequest) {
  return executar(request)
}
