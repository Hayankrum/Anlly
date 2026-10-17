import { useLiveQuery } from 'dexie-react-hooks'
import * as syncState from '../../db/sync-state.repo'
import { CHAVE_SYNC_GLOBAL, type EstadoSync, type SessaoLocal } from '../../db/schema'

const ESTADO_PADRAO: EstadoSync = {
  chave: CHAVE_SYNC_GLOBAL,
  cursor: '0',
  ultimaSincronizacao: null,
  sessao: null,
}

// A leitura do IndexedDB é assíncrona: ao montar cada página o `useLiveQuery`
// devolve o padrão (`sessao: null`) por um instante e a UI de "sem conta"
// pisca. Guardar o último estado conhecido evita o flash na troca de páginas.
let estadoCache: EstadoSync = ESTADO_PADRAO

export function useEstadoSync(): EstadoSync {
  const estado = useLiveQuery(() => syncState.obter(), [], estadoCache)
  estadoCache = estado
  return estado
}

export function useSessao(): SessaoLocal | null {
  return useEstadoSync().sessao
}
