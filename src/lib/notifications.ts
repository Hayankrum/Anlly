import { prisma } from './prisma'

interface CriarNotificacaoParams {
  usuarioId: number
  titulo: string
  mensagem: string
  url?: string
  tipo?: 'comentario' | 'sistema'
}

export async function criarNotificacao({ usuarioId, titulo, mensagem, url, tipo = 'sistema' }: CriarNotificacaoParams) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!usuario || !usuario.notificacoesAtivas) return

    if (tipo === 'comentario' && !usuario.notificarComentarios) return
    if (tipo === 'sistema' && !usuario.notificarSistema) return

    const notificacao = await prisma.notificacao.create({
      data: {
        titulo,
        mensagem,
        url: url || null,
        usuarioId,
      },
    })

    const inscricoes = await prisma.inscricaoPush.findMany({
      where: { usuarioId },
    })

    if (inscricoes.length > 0) {
      try {
        const webPushModule = await import('web-push')
        const webpush = webPushModule.default ?? webPushModule

        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
        const vapidEmail = process.env.VAPID_EMAIL

        if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) return notificacao

        webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

        const payload = JSON.stringify({
          title: titulo,
          body: mensagem,
          url: url || '/',
          icon: '/icons/icon.svg',
        })

        await Promise.allSettled(
          inscricoes.map(async (inscricao) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: inscricao.endpoint,
                  keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
                },
                payload
              )
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
      } catch (error) {
        console.error('[Notificação] Erro ao enviar push:', error)
      }
    }

    return notificacao
  } catch (error) {
    console.error('[Notificação] Erro ao criar notificação:', error)
  }
}
