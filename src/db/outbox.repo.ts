import db from './database'
import type { EntradaOutbox, Item, OperacaoOutbox } from './schema'
import type { Mutacao } from '@shared/schemas/outbox'
import { gerarId } from '../shared/lib/id'

export const LIMITE_LOTE_PUSH = 100
/** Depois de N rodadas sem resultado no push, a mutação é descartada. */
export const LIMITE_TENTATIVAS = 10

type ItemLegado = Item & { atualizadoEm?: number; deletadoEm?: number }

/**
 * Registros gravados antes da migração de campos (`atualizadoEm`/`deletadoEm`)
 * podem estar sem `updatedAt`/`deletedAt`; sem isso o push é rejeitado pelo
 * zod do servidor (`payload.updatedAt` esperado como número).
 */
export function normalizarItem(registro: Item): Item {
  const legado = registro as ItemLegado
  const item: Item = { ...registro }
  if (typeof item.updatedAt !== 'number') {
    item.updatedAt =
      typeof legado.atualizadoEm === 'number'
        ? legado.atualizadoEm
        : typeof item.criadoEm === 'number'
          ? item.criadoEm
          : Date.now()
  }
  if (typeof item.deletedAt !== 'number' && typeof legado.deletadoEm === 'number') {
    item.deletedAt = legado.deletadoEm
  }
  delete (item as ItemLegado).atualizadoEm
  delete (item as ItemLegado).deletadoEm
  return item
}

export function novaMutacao(
  tabela: string,
  registro: Item,
  operacao: OperacaoOutbox,
  criadoEm: number,
): EntradaOutbox {
  return {
    id: gerarId(),
    tabela,
    registroId: registro.id,
    operacao,
    payload: normalizarItem(registro),
    criadoEm,
    tentativas: 0,
  }
}

export function paraWire(entrada: EntradaOutbox): Mutacao {
  return {
    id: entrada.id,
    tabela: entrada.tabela,
    registroId: entrada.registroId,
    operacao: entrada.operacao,
    payload: normalizarItem(entrada.payload),
  }
}

export async function contarPendentes(): Promise<number> {
  return db.outbox.count()
}

export interface LoteCompactado {
  envio: EntradaOutbox[]
  descartaveis: string[]
}

function chaveMutacao(entrada: EntradaOutbox): string {
  return `${entrada.tabela}:${entrada.registroId}`
}

export async function compactarParaEnvio(
  limite: number = LIMITE_LOTE_PUSH,
): Promise<LoteCompactado> {
  const todas = await db.outbox.orderBy('criadoEm').toArray()
  const ultimaPorChave = new Map<string, EntradaOutbox>()
  for (const entrada of todas) {
    ultimaPorChave.set(chaveMutacao(entrada), entrada)
  }
  const envio = Array.from(ultimaPorChave.values()).slice(0, limite)
  const chavesEnvio = new Set(envio.map(chaveMutacao))
  const descartaveis = todas
    .filter(
      (entrada) =>
        chavesEnvio.has(chaveMutacao(entrada)) &&
        entrada.id !== ultimaPorChave.get(chaveMutacao(entrada))?.id,
    )
    .map((entrada) => entrada.id)
  return { envio, descartaveis }
}

export async function removerConfirmadas(ids: string[]): Promise<void> {
  if (ids.length > 0) await db.outbox.bulkDelete(ids)
}

/**
 * Marca mutações que saíram no push mas não tiveram resultado — conta a
 * tentativa e remove as que estouram o limite (não devem reenviar para sempre).
 * Retorna as descartadas para o chamador avisar o usuário.
 */
export async function contarTentativaSemResultado(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  return db.transaction('rw', db.outbox, async () => {
    const descartadas: string[] = []
    for (const id of ids) {
      const entrada = await db.outbox.get(id)
      if (entrada === undefined) continue
      const tentativas = entrada.tentativas + 1
      if (tentativas >= LIMITE_TENTATIVAS) {
        descartadas.push(id)
      } else {
        await db.outbox.update(id, { tentativas })
      }
    }
    if (descartadas.length > 0) await db.outbox.bulkDelete(descartadas)
    return descartadas
  })
}

type Ouvinte = () => void
const ouvintes = new Set<Ouvinte>()

export function aoMudarOutbox(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

db.outbox.hook('creating', () => {
  for (const ouvinte of ouvintes) ouvinte()
})
