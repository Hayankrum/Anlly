import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useToast } from '../ui/Toast'

/** Campo que marca a entrada-trap no `history.state`. */
const MARCA_TRAP = 'anllySairTrap'

/**
 * Evita fechamento acidental no app instalado.
 *
 * A PWA instalada não tem botão de voltar visível, e o gesto de puxar da
 * borda fecha o app direto quando o histórico está vazio — o sistema até
 * mostra a tela cinza de "nada atrás" durante o gesto.
 *
 * A estratégia: manter, na home, uma entrada-trap logo acima da raiz, com a
 * mesma URL e o mesmo `state.key`. O gesto consome a trap em vez de chegar
 * ao fim do histórico, e nós decidimos o que fazer:
 *
 *  - o voltar mudou de rota → navegação normal, não toca em nada;
 *  - a URL continuou igual e estamos na raiz → o gesto foi absorvido:
 *    a primeira puxada mostra o aviso e recria a trap; a segunda, dentro da
 *    janela, tenta fechar o app.
 *
 * Duas armadilhas de `createHashRouter` que este hook contorna:
 *
 *  1. Navegar por link usa `pushState` e NÃO dispara `popstate`. Guardar o
 *     href uma única vez (como a versão anterior fazia) deixa a referência
 *     velha e o aviso passa a disparar em qualquer página. Aqui a referência
 *     é reatualizada a cada rota, via `useLocation`.
 *
 *  2. Todas as rotas compartilham o mesmo documento, então `pathname` não
 *     muda sozinho — a detecção de "voltou de verdade" é pela comparação de
 *     href, e a de "estou na raiz" é pelo `pathname` do router.
 */
export function useSairComDoisToques(): void {
  const { mostrar } = useToast()
  const local = useLocation()
  const hrefRef = useRef(window.location.href)

  // Reatualiza a referência a cada navegação. Sem isto o href fica velho e
  // o aviso volta a aparecer em páginas que não são a home.
  useEffect(() => {
    hrefRef.current = window.location.href
  }, [local])

  useEffect(() => {
    const JANELA_SEGUNDA_PUXADA_MS = 2500
    let avisoEm = 0

    const aoVoltar = () => {
      const href = window.location.href
      const mudouDeRota = href !== hrefRef.current
      hrefRef.current = href

      // Voltou para uma página anterior de verdade: navegação comum.
      if (mudouDeRota) return

      // Mesma URL fora da home não deveria acontecer; fora da raiz não
      // seguramos o gesto — o usuário espera voltar, não ser avisado.
      if (local.pathname !== '/') return

      // Segunda puxada dentro da janela: fecha de verdade. No app instalado
      // `close()` encerra a janela; numa aba comum ele é simplesmente
      // ignorado (a trap segue segurando o histórico, sem tela cinza).
      if (Date.now() - avisoEm < JANELA_SEGUNDA_PUXADA_MS) {
        avisoEm = 0
        window.close()
        return
      }

      // Primeira puxada: avisa e reempurra a trap para o gesto seguinte
      // ter o que consumir.
      avisoEm = Date.now()
      mostrar('Puxe novamente para sair', { duracao: JANELA_SEGUNDA_PUXADA_MS })
      cercar()
    }

    window.addEventListener('popstate', aoVoltar)
    // A trap só existe na home. Em qualquer outra rota o voltar deve
    // navegar para a página anterior sem serem absorvido nem avisado.
    if (local.pathname === '/') cercar()
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [mostrar, local.pathname])
}

/**
 * Insere uma trap logo acima da entrada atual, com a mesma URL e o mesmo
 * `state.key` (para o router não enxergar navegação nova) e `idx` incrementado
 * (para o índice do histórico não descasuar).
 */
function cercar(): void {
  const estado = (window.history.state ?? {}) as Record<string, unknown>
  if (estado[MARCA_TRAP] === true) return // já há trap no topo
  const idx = typeof estado.idx === 'number' ? estado.idx : 0
  window.history.pushState(
    { ...estado, idx: idx + 1, [MARCA_TRAP]: true },
    '',
    window.location.href,
  )
}
