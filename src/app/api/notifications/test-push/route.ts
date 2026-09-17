import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Rota indisponível em produção' }, { status: 403 })
    }

    const { titulo, mensagem, url, tipo = 'sistema' } = await request.json()

    if (!titulo || !mensagem) {
      return NextResponse.json({ error: 'Título e mensagem são obrigatórios' }, { status: 400 })
    }

    if (tipo !== 'comentario' && tipo !== 'sistema') {
      return NextResponse.json({ error: 'Tipo deve ser "comentario" ou "sistema"' }, { status: 400 })
    }

    const usuarios = await prisma.usuario.findMany({
      where: { notificacoesAtivas: true },
      include: { inscricoes: true },
    })

    let totalEnviado = 0
    let totalInscricoes = 0
    let totalOmitido = 0

    const webPushModule = await import('web-push')
    const webpush = webPushModule.default ?? webPushModule

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidEmail = process.env.VAPID_EMAIL

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      return NextResponse.json({ error: 'Variáveis VAPID não configuradas' }, { status: 500 })
    }

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

    const payload = JSON.stringify({
      title: titulo,
      body: mensagem,
      url: url || '/',
      icon: '/icons/icon.svg',
    })

    for (const u of usuarios) {
      if (u.inscricoes.length === 0) continue

      if (tipo === 'comentario' && !u.notificarComentarios) {
        totalOmitido++
        continue
      }
      if (tipo === 'sistema' && !u.notificarSistema) {
        totalOmitido++
        continue
      }

      await prisma.notificacao.create({
        data: {
          titulo,
          mensagem,
          url: url || null,
          usuarioId: u.id,
        },
      })

      totalInscricoes += u.inscricoes.length

      await Promise.allSettled(
        u.inscricoes.map(async (inscricao) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: inscricao.endpoint,
                keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
              },
              payload
            )
            totalEnviado++
          } catch (err: unknown) {
            const pushError = err as { statusCode?: number }
            if (pushError.statusCode === 404 || pushError.statusCode === 410) {
              await prisma.inscricaoPush.delete({
                where: { id: inscricao.id },
              })
            }
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      tipo,
      usuariosNotificados: usuarios.length - totalOmitido,
      usuariosOmitidos: totalOmitido,
      inscricoesTotais: totalInscricoes,
      enviadosComSucesso: totalEnviado,
    })
  } catch (error) {
    console.error('[Test Push] Error:', error)
    return NextResponse.json({ error: 'Erro ao enviar notificações' }, { status: 500 })
  }
}
