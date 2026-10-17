import {
  ErroApi,
  ErroRede,
  enviarPush,
  obterSessao,
  puxar,
} from './api'
import {
  LIMITE_LOTE_PUSH,
  compactarParaEnvio,
  contarPendentes,
  contarTentativaSemResultado,
  paraWire,
  removerConfirmadas,
  aoMudarOutbox,
} from '../db/outbox.repo'
import * as syncState from '../db/sync-state.repo'
import type { Item } from '../db/schema'
import { aplicarRemoto, removerTombstonesConfirmados } from '../features/items/items.repo'
import { alinharContaLocal, transicaoEmAndamento } from '../features/conta/conta.repo'
import { ErroCotaExcedida, MENSAGEM_SEM_ESPACO_SYNC } from '../shared/lib/cota'
import { estimarArmazenamento } from '../shared/lib/storage'

export type FaseSync = 'parado' | 'ocioso' | 'sincronizando' | 'sem-sessao' | 'sem-conexao' | 'erro'

export interface StatusSync {
  fase: FaseSync
  pendentes: number
  ultimaSincronizacao: number | null
  ultimoErro: string | null
  proximaTentativaEm: number | null
  /** Mutações descartadas por rejeição permanente do servidor nesta sessão. */
  rejeitadas: number
}

const TIMEOUT_BACKOFF_BASE_MS = 2_000
const TIMEOUT_BACKOFF_MAX_MS = 5 * 60_000
const DEBOUNCE_ESCRITA_MS = 1_500
const LIMITE_PULL = 500
const MAX_PAGINAS_PULL = 10
const MAX_LOTES_PUSH = 20

let status: StatusSync = {
  fase: 'parado',
  pendentes: 0,
  ultimaSincronizacao: null,
  ultimoErro: null,
  proximaTentativaEm: null,
  rejeitadas: 0,
}

const ouvintes = new Set<(status: StatusSync) => void>()

function publicar(parcial: Partial<StatusSync>): void {
  status = { ...status, ...parcial }
  for (const ouvinte of ouvintes) ouvinte(status)
}

export function obterStatus(): StatusSync {
  return status
}

export function assinarStatus(ouvinte: (status: StatusSync) => void): () => void {
  ouvintes.add(ouvinte)
  ouvinte(status)
  return () => ouvintes.delete(ouvinte)
}

let rodando = false
let reexecutar = false
let tentativas = 0
let timerTentativa: ReturnType<typeof setTimeout> | null = null
let timerDebounce: ReturnType<typeof setTimeout> | null = null

// Trava de troca de conta: pausas > 0 impede novas rodadas e a geração muda
// toda vez que a trava é acionada, fazendo as fetches em andamento abortarem
// antes de gravar qualquer dado (nada da conta antiga vaza para a nova).
let pausas = 0
let geracao = 0
const esperandoParada = new Set<() => void>()

const TIMEOUT_PAUSA_MS = 8_000

function sinalizarParada(): void {
  for (const resolver of esperandoParada) resolver()
  esperandoParada.clear()
}

function aguardarParada(): Promise<void> {
  if (!rodando) return Promise.resolve()
  return new Promise<void>((resolver) => {
    const temporizador = setTimeout(resolver, TIMEOUT_PAUSA_MS)
    esperandoParada.add(() => {
      clearTimeout(temporizador)
      resolver()
    })
  })
}

/**
 * Interrompe o sync atual e impede novas rodadas até a função retornada ser
 * chamada. Use em volta de entrar/sair da conta.
 */
export async function pausarSync(): Promise<() => void> {
  pausas += 1
  geracao += 1
  await aguardarParada()
  let liberado = false
  return () => {
    if (liberado) return
    liberado = true
    pausas = Math.max(0, pausas - 1)
  }
}

async function devoParar(minhaGeracao: number): Promise<boolean> {
  if (pausas > 0 || minhaGeracao !== geracao) return true
  return transicaoEmAndamento()
}

function proximoBackoff(): number {
  const ms = Math.min(TIMEOUT_BACKOFF_MAX_MS, TIMEOUT_BACKOFF_BASE_MS * 2 ** tentativas)
  tentativas += 1
  return ms
}

function agendarTentativa(ms: number): void {
  if (timerTentativa !== null) clearTimeout(timerTentativa)
  timerTentativa = setTimeout(() => {
    timerTentativa = null
    void rodar()
  }, ms)
  publicar({ proximaTentativaEm: Date.now() + ms })
}

async function push(minhaGeracao: number): Promise<void> {
  for (let lote = 0; lote < MAX_LOTES_PUSH; lote += 1) {
    if (await devoParar(minhaGeracao)) return
    const { envio, descartaveis } = await compactarParaEnvio(LIMITE_LOTE_PUSH)
    if (envio.length === 0) return
    // O lote só pode sair se a conta ainda for a mesma da compactação: o
    // cookie pode já pertencer a outra conta e o servidor adotaria os itens.
    if (await devoParar(minhaGeracao)) return
    const resposta = await enviarPush(envio.map(paraWire))
    if (await devoParar(minhaGeracao)) return
    const porId = new Map(resposta.resultados.map((resultado) => [resultado.mutacaoId, resultado]))
    const confirmados: string[] = [...descartaveis]
    const vencedoresRemotos: Item[] = []
    const semResultado: string[] = []
    let rejeitadasNesteLote = 0
    for (const entrada of envio) {
      const resultado = porId.get(entrada.id)
      if (resultado === undefined) {
        // Servidor não respondeu sobre esta mutação: conta a tentativa e,
        // se nunca responder, descarta em vez de reenviar para sempre.
        semResultado.push(entrada.id)
        continue
      }
      if (resultado.status === 'invalida') {
        // Rejeição permanente (tabela errada, registro de outra conta):
        // reenviar não resolve. Descarta e avisa — o item continua local.
        confirmados.push(entrada.id)
        rejeitadasNesteLote += 1
        continue
      }
      confirmados.push(entrada.id)
      // 'ignorada': servidor ficou com a versão mais nova → reconcilia local,
      // mas só se não houver edição local mais recente (aplicarRemoto decide).
      if (resultado.status === 'ignorada' && resultado.registro !== undefined) {
        vencedoresRemotos.push(resultado.registro)
      }
    }
    await removerConfirmadas(confirmados)
    const descartadas = await contarTentativaSemResultado(semResultado)
    if (rejeitadasNesteLote > 0 || descartadas.length > 0) {
      publicar({
        rejeitadas:
          status.rejeitadas + rejeitadasNesteLote + descartadas.length,
        ultimoErro: `${rejeitadasNesteLote + descartadas.length} alteração(ões) não puderam ser enviadas e foram descartadas do envio. Os itens continuam neste aparelho — edite-os de novo para reenviar.`,
      })
    }
    for (const vencedor of vencedoresRemotos) {
      await aplicarRemoto([vencedor])
    }
    if (envio.length < LIMITE_LOTE_PUSH) return
  }
}

async function pull(minhaGeracao: number): Promise<void> {
  for (let pagina = 0; pagina < MAX_PAGINAS_PULL; pagina += 1) {
    if (await devoParar(minhaGeracao)) return
    const { cursor } = await syncState.obter()
    const resposta = await puxar(cursor, LIMITE_PULL)
    // Resposta da conta antiga nunca é gravada depois de uma troca.
    if (await devoParar(minhaGeracao)) return
    if (resposta.registros.length > 0) {
      try {
        const { quota, uso } = await estimarArmazenamento()
        if (quota > 0) {
          // Estimativa conservadora: ~2KB por item + 5MB de margem para estruturas do IndexedDB/outbox
          const estimadoBytes = resposta.registros.length * 2048
          const margemSeguranca = 5 * 1024 * 1024
          if (uso + estimadoBytes > quota - margemSeguranca) {
            throw new ErroCotaExcedida(MENSAGEM_SEM_ESPACO_SYNC)
          }
        }
      } catch (erro) {
        if (erro instanceof ErroCotaExcedida) throw erro
        // Se não conseguir estimar, segue e deixa o bulkPut falhar (tratado depois)
      }
      try {
        await aplicarRemoto(resposta.registros)
      } catch (erro) {
        // O bulkPut pode estourar entre a checagem e a escrita: mensagem do sync.
        if (erro instanceof ErroCotaExcedida) throw new ErroCotaExcedida(MENSAGEM_SEM_ESPACO_SYNC)
        throw erro
      }
    }
    await syncState.definirCursor(resposta.proximoCursor)
    if (!resposta.temMais) return
  }
}

const TRAVA_SYNC = 'meu-app:sync'

/**
 * Executa `fn` segurando a trava cross-tab (Web Locks). Duas abas abertas
 * não rodarão push/pull ao mesmo tempo; a segunda espera a primeira terminar.
 * Em navegador sem suporte, roda sem trava (comportamento antigo).
 */
async function comTravaSync<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(TRAVA_SYNC, fn)
  }
  return fn()
}

async function rodarInterno(): Promise<void> {
  if (rodando) {
    reexecutar = true
    return
  }
  if (pausas > 0) return
  rodando = true
  reexecutar = false
  const minhaGeracao = geracao
  let interrompida = false
  publicar({ fase: 'sincronizando', ultimoErro: null, proximaTentativaEm: null })
  try {
    const estado = await syncState.obter()
    let sessao = estado.sessao

    let sessaoServico: Awaited<ReturnType<typeof obterSessao>> | 'rede'
    try {
      sessaoServico = await obterSessao()
    } catch (erro) {
      if (erro instanceof ErroRede) sessaoServico = 'rede'
      else throw erro
    }

    if (await devoParar(minhaGeracao)) {
      interrompida = true
      return
    }

    if (sessaoServico === 'rede') {
      const pendentes = await contarPendentes()
      if (sessao !== null) {
        const ms = proximoBackoff()
        agendarTentativa(ms)
        publicar({ fase: 'sem-conexao', pendentes })
      } else {
        // Sem conta e sem rede: app segue 100% local, sem alarme.
        publicar({ fase: 'ocioso', pendentes })
      }
      return
    }

    if (sessaoServico === null) {
      if (sessao !== null) await syncState.definirSessao(null)
      publicar({ fase: 'sem-sessao', pendentes: await contarPendentes() })
      return
    }

    sessao = sessaoServico
    await syncState.definirSessao(sessao)
    // Se o cookie já é de outra conta que os dados locais (troca feita em
    // outra aba ou app fechado no meio), apaga em vez de misturar contas.
    await alinharContaLocal(sessao.usuarioId)

    if (await devoParar(minhaGeracao)) {
      interrompida = true
      return
    }

    await push(minhaGeracao)
    await pull(minhaGeracao)

    // Tombstones confirmados pelo push não precisam mais ficar no aparelho;
    // a limpeza é best-effort e nunca derruba a rodada de sync por erro.
    try {
      await removerTombstonesConfirmados()
    } catch {
      /* tenta de novo na próxima rodada */
    }

    const ultimaSincronizacao = Date.now()
    await syncState.marcarSincronizacao(ultimaSincronizacao)
    tentativas = 0
    publicar({
      fase: 'ocioso',
      pendentes: await contarPendentes(),
      ultimaSincronizacao,
      proximaTentativaEm: null,
    })
  } catch (erro) {
    if (pausas > 0 || minhaGeracao !== geracao) {
      interrompida = true
      return
    }
    const pendentes = await contarPendentes().catch(() => status.pendentes)
    const ehApi401 = erro instanceof ErroApi && erro.status === 401
    if (ehApi401) {
      await syncState.definirSessao(null)
      publicar({ fase: 'sem-sessao', pendentes })
      return
    }
    if (erro instanceof ErroCotaExcedida) {
      // Sem espaço: não avança cursor, não faz backoff automático pesado — orienta o usuário
      publicar({
        fase: 'erro',
        pendentes,
        ultimoErro: erro.message,
        proximaTentativaEm: null,
      })
      tentativas = 0
      return
    }
    const ehRede = erro instanceof ErroRede
    const ms = proximoBackoff()
    agendarTentativa(ms)
    publicar({
      fase: ehRede ? 'sem-conexao' : 'erro',
      pendentes,
      ultimoErro: erro instanceof Error ? erro.message : String(erro),
    })
  } finally {
    rodando = false
    if (interrompida) {
      const pendentes = await contarPendentes().catch(() => status.pendentes)
      publicar({ fase: 'ocioso', pendentes, proximaTentativaEm: null, ultimoErro: null })
    }
    sinalizarParada()
    if (reexecutar) {
      reexecutar = false
      if (status.fase === 'ocioso') void rodar()
    }
  }
}

async function rodar(): Promise<void> {
  await comTravaSync(rodarInterno)
}

export async function sincronizarAgora(): Promise<void> {
  tentativas = 0
  if (timerTentativa !== null) {
    clearTimeout(timerTentativa)
    timerTentativa = null
  }
  publicar({ proximaTentativaEm: null })
  await rodar()
}

function agendarPorEscrita(): void {
  if (status.fase === 'sem-sessao' || status.fase === 'parado') return
  if (timerDebounce !== null) clearTimeout(timerDebounce)
  timerDebounce = setTimeout(() => {
    timerDebounce = null
    void rodar()
  }, DEBOUNCE_ESCRITA_MS)
}

let iniciado = false

export function iniciarSync(): void {
  if (iniciado) return
  iniciado = true
  aoMudarOutbox(agendarPorEscrita)
  window.addEventListener('online', () => {
    void sincronizarAgora()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sincronizarAgora()
  })
  void rodar()
}

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__sync = {
    status: obterStatus,
    agora: sincronizarAgora,
  }
}
