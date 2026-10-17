import { useLiveQuery } from 'dexie-react-hooks'
import type { FiltroItens, Item } from '../../db/schema'
import * as itemsRepo from './items.repo'

export interface OpcoesItens {
  busca?: string
  filtro?: FiltroItens
}

// A leitura do IndexedDB é assíncrona: ao montar cada página o `useLiveQuery`
// devolve `[]` por um instante e o estado vazio pisca. Guardar o último
// resultado por filtro evita o flash na troca de páginas.
const cacheItens = new Map<string, Item[]>()

export function useItems({ busca = '', filtro = 'todos' }: OpcoesItens = {}): Item[] {
  const chave = `${busca}\u0000${filtro}`
  const resultado = useLiveQuery(
    () => itemsRepo.listar({ busca, filtro }),
    [busca, filtro],
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
