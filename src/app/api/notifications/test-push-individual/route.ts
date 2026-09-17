import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Rota indisponível em produção' }, { status: 403 })
    }

    const { usuarioId, titulo, mensagem, url, tipo = 'sistema' } = await request.json()

    if (!usuarioId || !titulo || !mensagem) {
      return NextResponse.json({ error: 'usuarioId, título e mensagem são obrigatórios' }, { status: 400 })
    }

    if (tipo !== 'comentario' && tipo !== 'sistema') {
      return NextResponse.json({ error: 'Tipo deve ser "comentario" ou "sistema"' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { inscricoes: true },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (!usuario.notificacoesAtivas) {
      return NextResponse.json({ error: 'Usuário com notificações desativadas' }, { status: 400 })
    }

    if (tipo === 'comentario' && !usuario.notificarComentarios) {
      return NextResponse.json({ error: 'Usuário desativou notificações de comentários' }, { status: 400 })
    }

    if (tipo === 'sistema' && !usuario.notificarSistema) {
      return NextResponse.json({ error: 'Usuário desativou notificações de sistema' }, { status: 400 })
    }

    await prisma.notificacao.create({
      data: {
        titulo,
        mensagem,
        url: url || null,
        usuarioId: usuario.id,
      },
    })

    if (usuario.inscricoes.length === 0) {
      return NextResponse.json({
        success: true,
        mensagem: 'Notificação criada no banco, mas usuário sem inscrições push',
        inscricoes: 0,
      })
    }

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

    let enviados = 0

    await Promise.allSettled(
      usuario.inscricoes.map(async (inscricao) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: inscricao.endpoint,
              keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
            },
            payload
          )
          enviados++
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

    return NextResponse.json({
      success: true,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      tipo,
      inscricoes: usuario.inscricoes.length,
      enviadosComSucesso: enviados,
    })
  } catch (error) {
    console.error('[Test Push Individual] Error:', error)
    return NextResponse.json({ error: 'Erro ao enviar notificação' }, { status: 500 })
  }
}
