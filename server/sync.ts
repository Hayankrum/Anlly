import { Hono } from 'hono'
import {
  pullQuerySchema,
  pushRequestSchema,
  TABELA_ITEMS,
  TABELA_MODELOS,
  type ResultadoMutacao,
} from '@shared/schemas/sync'
import type { Item, TipoItem } from '@shared/schemas/item'
import { modeloSchema, type Modelo } from '@shared/schemas/modelo'
import {
  faseTempoSchema,
  modoTempoSchema,
  quadroKanbanSchema,
  subitemSchema,
  TIPOS_ITEM,
} from '@shared/schemas/item'
import { prisma } from './prisma'
import { Prisma } from './generated/prisma/client'
import { z } from 'zod'
import { exigirSessao } from './session'
import { exigirTermosAceitos } from './termos'

// Relógio do aparelho é só pista, não autoridade: limitamos o futuro (5 min)
// e o passado (90 dias) para que um relógio absurdamente errado não vença o
// LWW para sempre. Edições legítimas offline ficam sempre dentro da janela.
const JANELA_FUTURO_MS = 5 * 60 * 1000
const JANELA_PASSADO_MS = 90 * 24 * 60 * 60 * 1000

type ItemTabela = {
  id: string
  userId: string
  titulo: string
  descricao: string
  concluido: boolean
  tipo: string
  parentId: string | null
  coluna: string | null
  ordem: number | null
  quadroKanban: unknown
  subitens: unknown
  modoTempo: string | null
  minutosFoco: number | null
  minutosPausa: number | null
  faseTempo: string | null
  ciclosConcluidos: number | null
  diasAgendamento: string[]
  horaAgendamento: string | null
  timerIniciadoEm: bigint | null
  tempoDecorridoMs: bigint | null
  criadoEm: bigint
  updatedAt: bigint
  deletedAt: bigint | null
  serverSeq: bigint
}

type ModeloTabela = {
  id: string
  userId: string
  titulo: string
  tipo: string
  payload: unknown
  updatedAt: bigint
  deletedAt: bigint | null
  serverSeq: bigint
}

function toWireModelo(registro: ModeloTabela): Modelo {
  const dados =
    typeof registro.payload === 'object' && registro.payload !== null
      ? registro.payload
      : {}
  return modeloSchema.parse({
    ...dados,
    id: registro.id,
    titulo: registro.titulo,
    tipo: registro.tipo,
    updatedAt: Number(registro.updatedAt),
    ...(registro.deletedAt === null ? {} : { deletedAt: Number(registro.deletedAt) }),
    serverVersion: Number(registro.serverSeq),
  })
}

function toWire(item: ItemTabela): Item {
  const quadroKanban = quadroKanbanSchema.safeParse(item.quadroKanban)
  const subitens = z.array(subitemSchema).safeParse(item.subitens)
  const modoTempo = modoTempoSchema.safeParse(item.modoTempo)
  const faseTempo = faseTempoSchema.safeParse(item.faseTempo)
  const base = {
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    concluido: item.concluido,
    // Itens antigos no banco podem ter valor fora do enum (default 'padrao').
    tipo: (TIPOS_ITEM as readonly string[]).includes(item.tipo)
      ? (item.tipo as TipoItem)
      : ('padrao' as TipoItem),
    ...(item.parentId === null ? {} : { parentId: item.parentId }),
    ...(item.coluna === null ? {} : { coluna: item.coluna }),
    ...(quadroKanban.success ? { quadroKanban: quadroKanban.data } : {}),
    ...(subitens.success && subitens.data.length > 0
      ? { subitens: subitens.data }
      : {}),
    ...(modoTempo.success ? { modoTempo: modoTempo.data } : {}),
    ...(item.minutosFoco === null ? {} : { minutosFoco: item.minutosFoco }),
    ...(item.minutosPausa === null ? {} : { minutosPausa: item.minutosPausa }),
    ...(faseTempo.success ? { faseTempo: faseTempo.data } : {}),
    ...(item.ciclosConcluidos === null ? {} : { ciclosConcluidos: item.ciclosConcluidos }),
    ...(item.ordem === null ? {} : { ordem: item.ordem }),
    ...(item.diasAgendamento.length === 0 ? {} : { diasAgendamento: item.diasAgendamento }),
    ...(item.horaAgendamento === null ? {} : { horaAgendamento: item.horaAgendamento }),
    ...(item.timerIniciadoEm === null ? {} : { timerIniciadoEm: Number(item.timerIniciadoEm) }),
    ...(item.tempoDecorridoMs === null ? {} : { tempoDecorridoMs: Number(item.tempoDecorridoMs) }),
    criadoEm: Number(item.criadoEm),
    updatedAt: Number(item.updatedAt),
    serverVersion: Number(item.serverSeq),
  }
  return item.deletedAt === null ? base : { ...base, deletedAt: Number(item.deletedAt) }
}

async function processarLote(
  userId: string,
  mutacoes: PushLote,
  resultados: ResultadoMutacao[],
): Promise<void> {
  const agoraMs = Date.now()
  const limiteTs = agoraMs + JANELA_FUTURO_MS
  const pisoTs = agoraMs - JANELA_PASSADO_MS

  await prisma.$transaction(async (tx) => {
    // Primeira operação da transação: incrementa o contador do usuário.
    // Isso locka a linha do usuário e serializa pushes concorrentes do mesmo
    // usuário antes de qualquer leitura/escrita em item (mesma ordem de lock
    // em todas as transações → sem deadlock, sem seq repetido).
    const inicial = await tx.user.update({
      where: { id: userId },
      data: { seq: { increment: 1 } },
      select: { seq: true },
    })
    let seqReservado: bigint | null = inicial.seq

    const proximoSeq = async (): Promise<bigint> => {
      if (seqReservado !== null) {
        const reservado = seqReservado
        seqReservado = null
        return reservado
      }
      const { seq } = await tx.user.update({
        where: { id: userId },
        data: { seq: { increment: 1 } },
        select: { seq: true },
      })
      return seq
    }

    for (const mut of mutacoes) {
      if (mut.tabela === TABELA_MODELOS) {
        const jaVista = await tx.syncMutation.findUnique({ where: { id: mut.id } })
        if (jaVista) {
          const atual = await tx.modelo.findUnique({ where: { id: mut.registroId } })
          if (atual && atual.userId === userId) {
            resultados.push({
              mutacaoId: mut.id,
              status: 'aplicada',
              serverVersion: Number(atual.serverSeq),
              registro: { tabela: TABELA_MODELOS, registro: toWireModelo(atual) },
            })
          } else {
            resultados.push({ mutacaoId: mut.id, status: 'aplicada' })
          }
          continue
        }

        const existente = await tx.modelo.findUnique({ where: { id: mut.registroId } })
        if (existente && existente.userId !== userId) {
          await tx.syncMutation.create({
            data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) },
          })
          resultados.push({ mutacaoId: mut.id, status: 'invalida' })
          continue
        }

        const payload = modeloSchema.parse(mut.payload)
        const updatedAt = Math.min(Math.max(payload.updatedAt, pisoTs), limiteTs)
        const deletedAt =
          payload.deletedAt === undefined
            ? existente?.deletedAt ?? null
            : BigInt(Math.min(payload.deletedAt, updatedAt))
        if (existente && existente.updatedAt > BigInt(updatedAt)) {
          await tx.syncMutation.create({
            data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) },
          })
          resultados.push({
            mutacaoId: mut.id,
            status: 'ignorada',
            serverVersion: Number(existente.serverSeq),
            registro: { tabela: TABELA_MODELOS, registro: toWireModelo(existente) },
          })
          continue
        }

        const seq = await proximoSeq()
        const gravado = await tx.modelo.upsert({
          where: { id: mut.registroId },
          create: {
            id: mut.registroId,
            userId,
            titulo: payload.titulo,
            tipo: payload.tipo,
            payload,
            updatedAt: BigInt(updatedAt),
            deletedAt,
            serverSeq: seq,
          },
          update: {
            titulo: payload.titulo,
            tipo: payload.tipo,
            payload,
            updatedAt: BigInt(updatedAt),
            deletedAt,
            serverSeq: seq,
          },
        })
        await tx.syncMutation.create({
          data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) },
        })
        resultados.push({
          mutacaoId: mut.id,
          status: 'aplicada',
          serverVersion: Number(seq),
          registro: { tabela: TABELA_MODELOS, registro: toWireModelo(gravado) },
        })
        continue
      }

      const jaVista = await tx.syncMutation.findUnique({ where: { id: mut.id } })
      if (jaVista) {
        const atual = await tx.item.findUnique({ where: { id: mut.registroId } })
        if (atual && atual.userId === userId) {
          resultados.push({
            mutacaoId: mut.id,
            status: 'aplicada',
            serverVersion: Number(atual.serverSeq),
            registro: { tabela: TABELA_ITEMS, registro: toWire(atual) },
          })
        } else {
          resultados.push({ mutacaoId: mut.id, status: 'aplicada' })
        }
        continue
      }

      const existente = await tx.item.findUnique({ where: { id: mut.registroId } })
      if (existente && existente.userId !== userId) {
        await tx.syncMutation.create({
          data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) },
        })
        resultados.push({ mutacaoId: mut.id, status: 'invalida' })
        continue
      }

      // Relógio do cliente é limitado nos dois sentidos: um relógio no futuro
      // não vence para sempre e um relógio atrasado demais não "repassa" uma
      // edição antiga como se fosse nova.
      const updatedAt = Math.min(Math.max(mut.payload.updatedAt, pisoTs), limiteTs)
      let deletedAt = mut.payload.deletedAt
      if (deletedAt !== undefined && deletedAt > updatedAt) deletedAt = updatedAt

      if (existente && existente.updatedAt > BigInt(updatedAt)) {
        await tx.syncMutation.create({
          data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) },
        })
        resultados.push({
          mutacaoId: mut.id,
          status: 'ignorada',
          serverVersion: Number(existente.serverSeq),
          registro: { tabela: TABELA_ITEMS, registro: toWire(existente) },
        })
        continue
      }

      const seq = await proximoSeq()
      const dadosItem = {
        titulo: mut.payload.titulo,
        descricao: mut.payload.descricao,
        concluido: mut.payload.concluido,
        tipo: mut.payload.tipo ?? 'padrao',
        parentId: mut.payload.parentId ?? null,
        coluna: mut.payload.coluna ?? null,
        ordem: mut.payload.ordem ?? null,
        quadroKanban: mut.payload.quadroKanban ?? Prisma.DbNull,
        subitens: mut.payload.subitens ?? Prisma.DbNull,
        modoTempo: mut.payload.modoTempo ?? null,
        minutosFoco: mut.payload.minutosFoco ?? null,
        minutosPausa: mut.payload.minutosPausa ?? null,
        faseTempo: mut.payload.faseTempo ?? null,
        ciclosConcluidos: mut.payload.ciclosConcluidos ?? null,
        diasAgendamento: mut.payload.diasAgendamento ?? [],
        horaAgendamento: mut.payload.horaAgendamento ?? null,
        timerIniciadoEm:
          mut.payload.timerIniciadoEm === undefined ? null : BigInt(mut.payload.timerIniciadoEm),
        tempoDecorridoMs:
          mut.payload.tempoDecorridoMs === undefined ? null : BigInt(mut.payload.tempoDecorridoMs),
        updatedAt: BigInt(updatedAt),
        serverSeq: seq,
      }
      // Tombstone só muda quando o payload declara deletedAt (criação ou
      // exclusão). Um upsert sem o campo não ressuscita um item excluído —
      // atualização antiga chegando depois do delete não traz o item de volta.
      const dadosComTombstone =
        deletedAt === undefined ? dadosItem : { ...dadosItem, deletedAt: BigInt(deletedAt) }
      const gravado = await tx.item.upsert({
        where: { id: mut.registroId },
        create: {
          id: mut.registroId,
          userId,
          criadoEm: BigInt(mut.payload.criadoEm),
          deletedAt: null,
          ...dadosComTombstone,
        },
        update: dadosComTombstone,
      })
      await tx.syncMutation.create({
        data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) },
      })
      resultados.push({
        mutacaoId: mut.id,
        status: 'aplicada',
        serverVersion: Number(seq),
        registro: { tabela: TABELA_ITEMS, registro: toWire(gravado) },
      })
    }

    // Lote sem nenhuma mutação aplicada devolve o número reservado
    // para não deixar buraco na sequência.
    if (seqReservado !== null) {
      await tx.user.update({
        where: { id: userId },
        data: { seq: { decrement: 1 } },
      })
    }
  })
}

type PushLote = ReturnType<typeof pushRequestSchema.parse>['mutacoes']

function ehConflitoConcorrente(erro: unknown): boolean {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    'code' in erro &&
    (erro as { code?: string }).code === 'P2002'
  )
}

export const syncRoutes = new Hono()

syncRoutes.post('/sync/push', async (c) => {
  const sessao = await exigirSessao(c)
  if (!sessao) return c.json({ erro: 'Não autenticado', code: 'UNAUTHORIZED' }, 401)
  if (!(await exigirTermosAceitos(sessao.userId))) {
    return c.json({ erro: 'Aceite os termos de uso para sincronizar', code: 'TERMOS_PENDENTES' }, 403)
  }

  const bruto: unknown = await c.req.json().catch(() => null)
  const parse = pushRequestSchema.safeParse(bruto)
  if (!parse.success) {
    return c.json({ erro: 'Payload inválido', detalhes: parse.error.issues }, 400)
  }

  const resultados: ResultadoMutacao[] = []
  try {
    try {
      await processarLote(sessao.userId, parse.data.mutacoes, resultados)
    } catch (erro) {
      if (!ehConflitoConcorrente(erro)) throw erro
      // Mutação simultânea em outra requisição: reprocessa (o id já visto vira replay).
      resultados.length = 0
      await processarLote(sessao.userId, parse.data.mutacoes, resultados)
    }
  } catch (erro) {
    console.error('push falhou', erro)
    return c.json({ erro: 'Falha ao processar o lote' }, 500)
  }

  const usuario = await prisma.user.findUnique({
    where: { id: sessao.userId },
    select: { seq: true },
  })
  return c.json({ resultados, proximoCursor: String(usuario?.seq ?? 0n) })
})

syncRoutes.get('/sync/pull', async (c) => {
  const sessao = await exigirSessao(c)
  if (!sessao) return c.json({ erro: 'Não autenticado', code: 'UNAUTHORIZED' }, 401)
  if (!(await exigirTermosAceitos(sessao.userId))) {
    return c.json({ erro: 'Aceite os termos de uso para sincronizar', code: 'TERMOS_PENDENTES' }, 403)
  }

  const parse = pullQuerySchema.safeParse({
    cursor: c.req.query('cursor'),
    limit: c.req.query('limit'),
  })
  if (!parse.success) {
    return c.json({ erro: 'Query inválida', detalhes: parse.error.issues }, 400)
  }
  const { cursor, limit } = parse.data

  const [itens, modelos] = await Promise.all([
    prisma.item.findMany({
      where: { userId: sessao.userId, serverSeq: { gt: BigInt(cursor) } },
      orderBy: { serverSeq: 'asc' },
      take: limit + 1,
    }),
    prisma.modelo.findMany({
      where: { userId: sessao.userId, serverSeq: { gt: BigInt(cursor) } },
      orderBy: { serverSeq: 'asc' },
      take: limit + 1,
    }),
  ])
  const linhas = [
    ...itens.map((registro) => ({
      serverSeq: registro.serverSeq,
      wire: { tabela: TABELA_ITEMS, registro: toWire(registro) },
    })),
    ...modelos.map((registro) => ({
      serverSeq: registro.serverSeq,
      wire: { tabela: TABELA_MODELOS, registro: toWireModelo(registro) },
    })),
  ].sort((a, b) => (a.serverSeq < b.serverSeq ? -1 : a.serverSeq > b.serverSeq ? 1 : 0))
  const temMais = linhas.length > limit
  const pagina = temMais ? linhas.slice(0, limit) : linhas
  const proximoCursor = pagina.length > 0 ? String(pagina[pagina.length - 1].serverSeq) : cursor

  return c.json({ registros: pagina.map((linha) => linha.wire), proximoCursor, temMais })
})
