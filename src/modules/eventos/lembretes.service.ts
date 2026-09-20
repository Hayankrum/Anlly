import { prisma } from '@/lib/prisma'
import { criarNotificacao } from '@/lib/notifications'
import { formatarOffset } from './types'

const LIMITE_POR_EXECUCAO = 50

export interface ResultadoDisparo {
  verificados: number
  enviados: number
  ignorados: number
}

export async function dispararLembretes(): Promise<ResultadoDisparo> {
  const agora = new Date()

  const vencidos = await prisma.reminder.findMany({
    where: { sentAt: null, notifyAt: { lte: agora } },
    include: { event: true },
    orderBy: { notifyAt: 'asc' },
    take: LIMITE_POR_EXECUCAO,
  })

  const resultado: ResultadoDisparo = {
    verificados: vencidos.length,
    enviados: 0,
    ignorados: 0,
  }

  for (const lembrete of vencidos) {
    const reserva = await prisma.reminder.updateMany({
      where: { id: lembrete.id, sentAt: null },
      data: { sentAt: new Date() },
    })

    if (reserva.count === 0 || lembrete.event.done) {
      resultado.ignorados++
      continue
    }

    if (lembrete.event.usuarioId == null) {
      resultado.ignorados++
      continue
    }

    const dono = await prisma.usuario.findUnique({
      where: { id: lembrete.event.usuarioId },
      select: { id: true, notificacoesAtivas: true, notificarSistema: true },
    })

    if (!dono || !dono.notificacoesAtivas || !dono.notificarSistema) {
      resultado.ignorados++
      continue
    }

    const quando =
      lembrete.offsetMinutes === 0
        ? 'Começa agora'
        : `Lembrete: ${formatarOffset(lembrete.offsetMinutes)}`
    const mensagem = lembrete.event.locationText
      ? `${quando} · ${lembrete.event.locationText}`
      : quando

    await criarNotificacao({
      usuarioId: dono.id,
      titulo: lembrete.event.title,
      mensagem,
      url: `/eventos/${lembrete.eventId}`,
    })

    resultado.enviados++
  }

  return resultado
}
