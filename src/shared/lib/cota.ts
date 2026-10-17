export const LIMITE_ALERTA_PERCENTUAL = 80
export const INTERVALO_REAVISO_MS = 24 * 60 * 60 * 1000

const CHAVE_ULTIMO_ALERTA = 'meu-app:cota-alerta-em'

/**
 * Erro de escrita local por falta de espaço no aparelho. Registro e outbox
 * são gravados na mesma transação, então nada fica corrompido — a operação
 * simplesmente não foi salva e o usuário precisa saber.
 */
export class ErroCotaExcedida extends Error {
  constructor(mensagem?: string) {
    super(
      mensagem ??
        'Sem espaço livre no aparelho: a alteração não foi salva. ' +
          'Exporte um backup ou libere espaço em Configurações.',
    )
    this.name = 'ErroCotaExcedida'
  }
}

/** Mensagem para quando o aparelho não tem espaço para baixar dados da conta. */
export const MENSAGEM_SEM_ESPACO_SYNC =
  'Sem espaço livre no aparelho: não foi possível baixar tudo da conta. ' +
  'Libere espaço em Configurações (ou remova itens antigos já sincronizados) e sincronize de novo.'

export function ehQuotaExcedida(erro: unknown): boolean {
  if (erro instanceof DOMException) {
    return erro.name === 'QuotaExceededError' || erro.code === 22
  }
  if (typeof erro === 'object' && erro !== null) {
    const envolucro = erro as { name?: unknown; message?: unknown; inner?: unknown }
    if (envolucro.name === 'QuotaExceededError') return true
    if (typeof envolucro.message === 'string' && /quota/i.test(envolucro.message)) return true
    if (envolucro.inner !== undefined && ehQuotaExcedida(envolucro.inner)) return true
  }
  return false
}

/** Converte erro de cota em ErroCotaExcedida e reprocessa o resto. */
export async function executarComCota<T>(escrita: () => Promise<T>): Promise<T> {
  try {
    return await escrita()
  } catch (erro) {
    if (ehQuotaExcedida(erro)) throw new ErroCotaExcedida()
    throw erro
  }
}

function lerUltimoAlerta(): number | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ULTIMO_ALERTA)
    if (bruto === null) return null
    const valor = Number(bruto)
    return Number.isFinite(valor) ? valor : null
  } catch {
    return null
  }
}

/** Devolve true se vale alertar de novo (uma vez por dia). */
export function deveAlertarCota(): boolean {
  const ultimo = lerUltimoAlerta()
  return ultimo === null || Date.now() - ultimo >= INTERVALO_REAVISO_MS
}

export function registrarAlertaCota(): void {
  try {
    localStorage.setItem(CHAVE_ULTIMO_ALERTA, String(Date.now()))
  } catch {
    // sem localStorage o próximo alerta pode sair mais cedo — sem problema
  }
}
