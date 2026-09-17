import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterSessao } from '@/lib/session'
import { rateLimit, getRateLimitKey } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const rlKey = getRateLimitKey(request, 'subscribe')
    const rl = rateLimit(rlKey, { windowMs: 60_000, max: 10 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 })
    }

    const usuario = await obterSessao()
    if (!usuario) {
      console.log('[Subscribe] Unauthorized attempt')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || typeof endpoint !== 'string') {
      console.log('[Subscribe] Invalid endpoint:', endpoint)
      return NextResponse.json({ error: 'Endpoint inválido' }, { status: 400 })
    }

    if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
      console.log('[Subscribe] Invalid keys')
      return NextResponse.json({ error: 'Chaves de criptografia inválidas' }, { status: 400 })
    }

    console.log('[Subscribe] User', usuario.id, 'subscribing with endpoint:', endpoint.substring(0, 50) + '...')

    // Check if endpoint already exists for another user
    const inscricaoExistente = await prisma.inscricaoPush.findUnique({
      where: { endpoint },
    })

    if (inscricaoExistente) {
      if (inscricaoExistente.usuarioId !== usuario.id) {
        // Endpoint belongs to another user, delete and recreate
        console.log('[Subscribe] Endpoint belongs to another user, transferring')
        await prisma.inscricaoPush.delete({
          where: { endpoint },
        })
      } else {
        // Same user, just update the keys
        console.log('[Subscribe] Endpoint already registered for this user, updating keys')
        await prisma.inscricaoPush.update({
          where: { endpoint },
          data: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        })
        return NextResponse.json({ message: 'Inscrição atualizada com sucesso' })
      }
    }

    // Delete all existing subscriptions for this user before creating new one
    const deletedCount = await prisma.inscricaoPush.deleteMany({
      where: { usuarioId: usuario.id },
    })
    if (deletedCount.count > 0) {
      console.log('[Subscribe] Cleaned', deletedCount.count, 'old subscriptions for user', usuario.id)
    }

    // Create new subscription
    await prisma.inscricaoPush.create({
      data: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        usuarioId: usuario.id,
      },
    })

    console.log('[Subscribe] Subscription created successfully for user', usuario.id)
    return NextResponse.json({ message: 'Inscrito com sucesso' })
  } catch (error) {
    console.error('[Subscribe] Error:', error)
    return NextResponse.json({ error: 'Erro ao inscrever' }, { status: 500 })
  }
}
