const CHAVE_APRESENTACAO = 'meu-app:apresentacao'

/**
 * Se a apresentação inicial já foi vista nesta instalação.
 * Sem acesso ao localStorage o app não é bloqueado pela apresentação.
 */
export function jaViuApresentacao(): boolean {
  try {
    return localStorage.getItem(CHAVE_APRESENTACAO) === '1'
  } catch {
    return true
  }
}

/** Marca a apresentação como vista — ela não aparece mais nas próximas visitas. */
export function marcarApresentacaoVista(): void {
  try {
    localStorage.setItem(CHAVE_APRESENTACAO, '1')
  } catch {
    // sem armazenamento a apresentação pode se repetir na próxima visita
  }
}
