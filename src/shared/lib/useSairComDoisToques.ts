import { useEffect } from 'react'
import { useToast } from '../ui/Toast'

/**
 * A entrada-cerco é única para a sessão: o StrictMode monta → desmonta →
 * monta de novo, e duplicaria a entrada no histórico.
 */
let cercoCriado = false

/**
 * Evita fechamento acidental no app instalado.
 *
 * A PWA não tem botão de voltar visível nem `window.close()` confiável, e o
 * gesto de puxar da borda fecha o app direto quando o histórico está vazio —
 * o sistema até mostra a tela cinza de "nada atrás" durante o gesto. Para
 * disfarçar isso, mantemos uma entrada extra no histórico (a "cerco") com a
 * mesma URL: a primeira puxada volta para ela — a tela continua igual — e um
 * aviso discreto pede a segunda puxada; a segunda, dentro da janela, sai de
 * verdade.
 */
export function useSairComDoisToques(): void {
  const { mostrar } = useToast()

  useEffect(() => {
    const JANELA_SEGUNDA_PUXADA_MS = 2500
    let urlAtual = window.location.href
    let avisoEm = 0

    if (!cercoCriado) {
      cercoCriado = true
      // Preserva o estado do react-router (idx/usr/key) para não confundir
      // o router quando a puxada voltar para esta entrada.
      window.history.pushState({ ...window.history.state, anllyCercoSair: true }, '')
    }

    const aoVoltar = () => {
      // URL mudou: a puxada navegou de verdade (ex.: detalhe → lista).
      if (window.location.href !== urlAtual) {
        urlAtual = window.location.href
        return
      }

      // Segunda puxada dentro da janela: sai de verdade. No app instalado
      // `close()` fecha a janela; numa aba comum ele é ignorado e o
      // `go(-1)` volta para a página anterior (ou o sistema fecha).
      if (Date.now() - avisoEm < JANELA_SEGUNDA_PUXADA_MS) {
        avisoEm = 0
        window.close()
        window.history.go(-1)
        return
      }

      // Primeira puxada: avisa e reempurra a entrada-cerco.
      avisoEm = Date.now()
      mostrar('Puxe novamente para sair', { duracao: JANELA_SEGUNDA_PUXADA_MS })
      window.history.pushState({ ...window.history.state, anllyCercoSair: true }, '')
    }

    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [mostrar])
}
