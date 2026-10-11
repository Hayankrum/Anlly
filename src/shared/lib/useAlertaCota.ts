import { useEffect } from 'react'
import { useToast } from '../ui/Toast'
import {
  LIMITE_ALERTA_PERCENTUAL,
  deveAlertarCota,
  registrarAlertaCota,
} from './cota'
import { estimarArmazenamento } from './storage'
import { formatarBytes } from './date'

/**
 * Alerta (uma vez por dia) quando o uso do armazenamento do navegador passa
 * de 80% da cota — antes de a escrita começar a falhar por QuotaExceededError.
 */
export function useAlertaCota(): void {
  const { mostrar } = useToast()

  useEffect(() => {
    let ativo = true

    async function verificar() {
      if (!deveAlertarCota()) return
      const info = await estimarArmazenamento()
      if (!ativo || info.quota === 0 || info.percentual < LIMITE_ALERTA_PERCENTUAL) return
      registrarAlertaCota()
      const espaco = info.persistente
        ? ''
        : ' O espaço deste app também não está garantido — o navegador pode apagar dados locais.'
      mostrar(
        `O armazenamento do navegador está quase cheio (${formatarBytes(info.uso)} de ${formatarBytes(
          info.quota,
        )}). Libere espaço em Configurações ou exporte um backup antes que as alterações parem de ser salvas.${espaco}`,
        { tipo: 'erro', duracao: 12000 },
      )
    }

    const aoVoltarParaVisivel = () => {
      if (document.visibilityState === 'visible') void verificar()
    }

    void verificar()
    document.addEventListener('visibilitychange', aoVoltarParaVisivel)
    return () => {
      ativo = false
      document.removeEventListener('visibilitychange', aoVoltarParaVisivel)
    }
  }, [mostrar])
}
