import { Hono } from 'hono'
import {
  listaDispositivosSchema,
  revogarDispositivoSchema,
  resumirUserAgent,
  type SessaoDispositivo,
} from '@shared/sessoes'
import { prisma } from './prisma'
import { exigirSessao } from './session'

export const sessoesRoutes = new Hono()

/**
 * Lista os dispositivos conectados à conta (uma linha por sessão ativa do
 * better-auth), com o userAgent resumido em algo legível. O token da sessão
 * nunca sai daqui — só o id opaco da linha.
 */
sessoesRoutes.get('/sessoes', async (c) => {
  const sessao = await exigirSessao(c)
  if (!sessao) return c.json({ erro: 'Não autenticado', code: 'UNAUTHORIZED' }, 401)

  const agora = new Date()
  const linhas = await prisma.session.findMany({
    where: { userId: sessao.userId, expiresAt: { gt: agora } },
    orderBy: { createdAt: 'desc' },
  })

  const dispositivos: SessaoDispositivo[] = linhas.map((linha) => {
    const resumo = resumirUserAgent(linha.userAgent)
    return {
      id: linha.id,
      navegador: resumo.navegador,
      sistema: resumo.sistema,
      tipo: resumo.tipo,
      conectadoEm: linha.createdAt.getTime(),
      atual: linha.id === sessao.sessaoId,
    }
  })

  // Este aparelho sempre em cima; os demais, do mais recente para o mais antigo.
  // O orderBy do banco usa só createdAt, então sem isto um aparelho logado
  // antes apareceria acima do que você está usando agora.
  dispositivos.sort((a, b) => Number(b.atual) - Number(a.atual) || b.conectadoEm - a.conectadoEm)

  // Valida a saída com o mesmo schema que o cliente espera.
  const parse = listaDispositivosSchema.safeParse({ dispositivos })
  if (!parse.success) return c.json({ erro: 'Erro interno ao montar lista', code: 'INTERNAL' }, 500)
  return c.json(parse.data)
})

/**
 * Desconecta um dispositivo (revoga a sessão no servidor). A trava de
 * pertencimento está no where: só sessões do próprio usuário são afetadas.
 */
sessoesRoutes.post('/sessoes/revogar', async (c) => {
  const sessao = await exigirSessao(c)
  if (!sessao) return c.json({ erro: 'Não autenticado', code: 'UNAUTHORIZED' }, 401)

  const bruto: unknown = await c.req.json().catch(() => null)
  const parse = revogarDispositivoSchema.safeParse(bruto)
  if (!parse.success) {
    return c.json({ erro: 'Payload inválido', code: 'INVALID_PAYLOAD' }, 400)
  }

  const { count } = await prisma.session.deleteMany({
    where: { id: parse.data.id, userId: sessao.userId },
  })
  if (count === 0) return c.json({ erro: 'Dispositivo não encontrado', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true })
})

/**
 * Desconecta todos os outros dispositivos de uma vez, mantendo o atual.
 */
sessoesRoutes.post('/sessoes/revogar-outros', async (c) => {
  const sessao = await exigirSessao(c)
  if (!sessao) return c.json({ erro: 'Não autenticado', code: 'UNAUTHORIZED' }, 401)

  const { count } = await prisma.session.deleteMany({
    where: { userId: sessao.userId, id: { not: sessao.sessaoId } },
  })
  return c.json({ ok: true, desconectados: count })
})
