import db from '../../db/database'
import { CHAVES, definir, obter, remover } from '../../db/config.repo'
import { normalizarItem, novaMutacao } from '../../db/outbox.repo'
import * as syncState from '../../db/sync-state.repo'
import { executarComCota } from '../../shared/lib/cota'
import type { SessaoLocal } from '@shared/schemas/usuario'

const TABELA = 'items'

/**
 * Enfileira na outbox todos os itens que ainda não têm mutação pendente,
 * inclusive tombstones (`deletedAt`) — a primeira sincronização após o login
 * leva o estado completo sem duplicar (a compactação por registro já garante
 * uma única mutação por item).
 */
export async function enfileirarItensParaSync(): Promise<number> {
  let enfileiradas = 0
  await executarComCota(() =>
    db.transaction('rw', db.items, db.modelos, db.outbox, async () => {
      const pendentes = new Set(
        (await db.outbox.toArray()).map((entrada) => `${entrada.tabela}:${entrada.registroId}`),
      )
      const agora = Date.now()
      const itens = await db.items.toArray()
      const modelos = await db.modelos.toArray()
      const normais = itens.map(normalizarItem)
      const reparados = normais.filter(
        (item, indice) =>
          item.updatedAt !== itens[indice].updatedAt || item.deletedAt !== itens[indice].deletedAt,
      )
      if (reparados.length > 0) await db.items.bulkPut(reparados)
      const mutacoes = normais
        .filter((item) => !pendentes.has(`${TABELA}:${item.id}`))
        .map((item) =>
          novaMutacao(
            TABELA,
            item,
            item.deletedAt !== undefined ? 'delete' : 'upsert',
            agora,
          ),
        )
      const mutacoesModelos = modelos
        .filter((modelo) => !pendentes.has(`modelos:${modelo.id}`))
        .map((modelo) =>
          novaMutacao(
            'modelos',
            modelo,
            modelo.deletedAt !== undefined ? 'delete' : 'upsert',
            agora,
          ),
        )
      mutacoes.push(...mutacoesModelos)
      if (mutacoes.length > 0) {
        await db.outbox.bulkAdd(mutacoes)
        enfileiradas = mutacoes.length
      }
    }),
  )
  return enfileiradas
}

/**
 * Apaga itens, outbox e reseta o cursor — usado ao entrar com uma conta
 * diferente da anterior, para não levar dados de uma conta para outra.
 */
export async function apagarDadosLocais(): Promise<void> {
  await db.transaction('rw', db.items, db.modelos, db.outbox, db.syncState, async () => {
    await db.items.clear()
    await db.modelos.clear()
    await db.outbox.clear()
    await syncState.definirCursor('0')
  })
}

export type ResultadoPreparacao = 'mesmo-usuario' | 'conta-alterada' | 'primeiro-acesso'

/**
 * Chamado logo após entrar/criar conta, antes da primeira sincronização:
 * grava a sessão local, então
 * - mesma conta (ou primeiro acesso): enfileira o que falta (tudo, se for a
 *   primeira sincronização da vida deste aparelho);
 * - conta diferente: apaga os dados locais para não misturar contas.
 */
export async function conectar(sessao: SessaoLocal): Promise<ResultadoPreparacao> {
  await syncState.definirSessao(sessao)
  const anterior = await obter(CHAVES.ultimoUsuarioId)
  let resultado: ResultadoPreparacao
  if (anterior === undefined || anterior === null) {
    await enfileirarItensParaSync()
    resultado = 'primeiro-acesso'
  } else if (anterior === sessao.usuarioId) {
    await enfileirarItensParaSync()
    resultado = 'mesmo-usuario'
  } else {
    await apagarDadosLocais()
    resultado = 'conta-alterada'
  }
  await definir(CHAVES.ultimoUsuarioId, sessao.usuarioId)
  return resultado
}

/**
 * Sinaliza (antes de o cookie mudar) que uma troca de conta está em
 * andamento: o sync em outras abas/instâncias interrompe push e pull na hora,
 * para nenhum lote da conta antiga ser enviado com o cookie novo.
 *
 * O valor é um timestamp: uma troca abandonada por crash expira sozinha e o
 * sync volta a funcionar (nunca trava para sempre).
 */
const TIMEOUT_TRANSICAO_MS = 60_000

export async function iniciarTransicaoDeConta(): Promise<void> {
  await definir(CHAVES.transicaoConta, Date.now())
}

export async function finalizarTransicaoDeConta(): Promise<void> {
  await remover(CHAVES.transicaoConta)
}

export async function transicaoEmAndamento(): Promise<boolean> {
  const valor = await obter(CHAVES.transicaoConta)
  if (typeof valor !== 'number') return false
  if (Date.now() - valor > TIMEOUT_TRANSICAO_MS) {
    await remover(CHAVES.transicaoConta)
    return false
  }
  return true
}

/**
 * Última linha de defesa do sync: garante que os dados locais pertencem à
 * conta da sessão do servidor. Se o cookie mudou de conta sem passar por
 * `conectar` (outra aba, app fechado no meio da troca), apaga os dados locais
 * em vez de empurrar itens de uma conta para a outra.
 */
export async function alinharContaLocal(usuarioId: string): Promise<void> {
  const anterior = await obter(CHAVES.ultimoUsuarioId)
  if (anterior === usuarioId) return
  if (anterior !== undefined && anterior !== null) {
    await apagarDadosLocais()
  } else {
    await enfileirarItensParaSync()
  }
  await definir(CHAVES.ultimoUsuarioId, usuarioId)
}

/** Sai da conta no servidor e limpa a sessão local (os dados ficam no aparelho). */
export async function desconectar(): Promise<void> {
  await syncState.definirSessao(null)
}
