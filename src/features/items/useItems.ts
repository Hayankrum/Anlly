import { useLiveQuery } from 'dexie-react-hooks'
import type { Item, PeriodoItens } from '../../db/schema'
import * as itemsRepo from './items.repo'

export interface OpcoesItens {
  busca?: string
  periodo?: PeriodoItens
}

// A leitura do IndexedDB é assíncrona: ao montar cada página o `useLiveQuery`
// devolve `[]` por um instante e o estado vazio pisca. Guardar o último
// resultado por consulta evita o flash na troca de páginas.
const cacheItens = new Map<string, Item[]>()

export function useItems({ busca = '', periodo }: OpcoesItens = {}): Item[] {
  const chave = `${busca}\u0000${periodo ?? ''}`
  const resultado = useLiveQuery(
    () => itemsRepo.listar({ busca, periodo }),
    [busca, periodo],
    cacheItens.get(chave) ?? ([] as Item[]),
  )
  cacheItens.set(chave, resultado)
  return resultado
}

interface Estatisticas {
  total: number
  concluidos: number
  pendentes: number
}

const ESTATISTICAS_VAZIA: Estatisticas = { total: 0, concluidos: 0, pendentes: 0 }

export function useItemsStats(): Estatisticas {
  return useLiveQuery(async () => {
    const itens = await itemsRepo.listar()
    const concluidos = itens.filter((item) => item.concluido).length
    return { total: itens.length, concluidos, pendentes: itens.length - concluidos }
  }, [], ESTATISTICAS_VAZIA)
}

/** Cartões do quadro de um projeto, reativos (atualizam ao arrastar/salvar). */
export function useCartoes(projetoId: string): Item[] {
  const chave = `cartoes:${projetoId}`
  const resultado = useLiveQuery(
    () => itemsRepo.listarCartoes(projetoId),
    [projetoId],
    cacheItens.get(chave) ?? ([] as Item[]),
  )
  cacheItens.set(chave, resultado)
  return resultado
}

/** Progresso (total/feitos) dos projetos kanban da lista — reativo. */
export function useProgressoProjetos(ids: string[]): Map<string, { total: number; feitos: number }> {
  const chave = `progresso:${ids.join(',')}`
  return useLiveQuery(
    () => itemsRepo.progressoProjetos(ids),
    [chave],
    new Map<string, { total: number; feitos: number }>(),
  )
}
