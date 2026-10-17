import db from './database'
import { CHAVE_SYNC_GLOBAL, type EstadoSync, type SessaoLocal } from './schema'

const PADRAO: EstadoSync = {
  chave: CHAVE_SYNC_GLOBAL,
  cursor: '0',
  ultimaSincronizacao: null,
  sessao: null,
}

// Espelho síncrono da sessão: o IndexedDB é assíncrono, então no primeiro
// render de uma abertura a frio a sessão ainda não foi lida e a UI de "sem
// conta" pisca. O localStorage permite saber o estado já no primeiro render.
const CHAVE_SESSAO_ESPELHO = 'meu-app:sessao-espelho'

export function lerSessaoEspelho(): SessaoLocal | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO_ESPELHO)
    return bruto === null ? null : (JSON.parse(bruto) as SessaoLocal)
  } catch {
    return null
  }
}

function gravarSessaoEspelho(sessao: SessaoLocal | null): void {
  try {
    if (sessao === null) localStorage.removeItem(CHAVE_SESSAO_ESPELHO)
    else localStorage.setItem(CHAVE_SESSAO_ESPELHO, JSON.stringify(sessao))
  } catch {
    /* sem localStorage o espelho assíncrono (IndexedDB) segue valendo */
  }
}

export async function obter(): Promise<EstadoSync> {
  const existente = await db.syncState.get(CHAVE_SYNC_GLOBAL)
  return existente ?? { ...PADRAO }
}

async function gravar(atualizado: Partial<Omit<EstadoSync, 'chave'>>): Promise<void> {
  const atual = await obter()
  await db.syncState.put({ ...atual, ...atualizado, chave: CHAVE_SYNC_GLOBAL })
}

export async function definirCursor(cursor: string): Promise<void> {
  await gravar({ cursor })
}

export async function marcarSincronizacao(ultimaSincronizacao: number = Date.now()): Promise<void> {
  await gravar({ ultimaSincronizacao })
}

export async function definirSessao(sessao: SessaoLocal | null): Promise<void> {
  await gravar({ sessao })
  gravarSessaoEspelho(sessao)
}
