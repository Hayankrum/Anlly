import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as MouseEventReact,
  type PointerEvent as PointerEventReact,
} from 'react'

/** Distância (px) que transforma o clique em arrasto e cancela a espera. */
const DISTANCIA_CANCELAMENTO = 14

/**
 * Toques mais curtos que isto são cliques (podem abrir detalhes); mais
 * longos são uma espera deliberada e nunca podem navegar para lado nenhum.
 */
const TOQUE_MS = 350

interface OpcoesSegurar {
  /** Disparada quando a espera chega a 100%. */
  aoConcluir: () => void
  /** Disparada num clique curto ou em Enter/Space. */
  aoTocar?: (evento: MouseEventReact) => void
  /** Tempo que o utilizador deve manter pressionado. */
  duracaoMs?: number
}

interface SegurarParaConcluir {
  /** 0..1 do anel de confirmação. */
  progresso: number
  segurando: boolean
  /** Espalhar no elemento interativo (pointer + click). */
  propsSegurar: {
    onPointerDown: (evento: PointerEventReact) => void
    onClick: (evento: MouseEventReact) => void
  }
}

interface EstadoEspera {
  inicio: number
  origemX: number
  origemY: number
  raf: number
  concluido: boolean
  suprimirClique: boolean
  move: ((evento: PointerEvent) => void) | null
  soltar: (() => void) | null
}

/**
 * Gesto "pressionar e segurar" usado na trilha.
 *
 * Um toque curto nunca conclui nada — só dispara `aoTocar`; e a espera nunca
 * abre detalhes: soltar antes de `duracaoMs` simplesmente cancela. A espera
 * tem de correr durante `duracaoMs` sem o dedo/rato deslizar, caso contrário
 * reinicia. Toca, caneta e rato funcionam porque o gesto é movido a pointer
 * com listeners ao nível da janela.
 */
export function useSegurarParaConcluir({
  aoConcluir,
  aoTocar,
  duracaoMs = 3000,
}: OpcoesSegurar): SegurarParaConcluir {
  const [progresso, setProgresso] = useState(0)
  const [segurando, setSegurando] = useState(false)

  const opcoesRef = useRef({ aoConcluir, aoTocar, duracaoMs })

  useEffect(() => {
    opcoesRef.current = { aoConcluir, aoTocar, duracaoMs }
  })

  const estadoRef = useRef<EstadoEspera>({
    inicio: 0,
    origemX: 0,
    origemY: 0,
    raf: 0,
    concluido: false,
    suprimirClique: false,
    move: null,
    soltar: null,
  })

  const terminar = useCallback(() => {
    const estado = estadoRef.current
    if (estado.raf) cancelAnimationFrame(estado.raf)
    estado.raf = 0
    if (estado.move) window.removeEventListener('pointermove', estado.move)
    if (estado.soltar) {
      window.removeEventListener('pointerup', estado.soltar)
      window.removeEventListener('pointercancel', estado.soltar)
    }
    estado.move = null
    estado.soltar = null
    setSegurando(false)
    setProgresso(0)
  }, [])

  const concluir = useCallback(() => {
    const estado = estadoRef.current
    estado.concluido = true
    estado.suprimirClique = true
    terminar()
    opcoesRef.current.aoConcluir()
  }, [terminar])

  const onPointerDown = useCallback(
    (evento: PointerEventReact) => {
      const estado = estadoRef.current
      estado.suprimirClique = false
      if (segurando) return
      if (!evento.isPrimary || (evento.button !== undefined && evento.button !== 0)) return

      estado.concluido = false
      estado.origemX = evento.clientX
      estado.origemY = evento.clientY
      estado.inicio = performance.now()

      const move = (ponteiro: PointerEvent) => {
        const dx = ponteiro.clientX - estado.origemX
        const dy = ponteiro.clientY - estado.origemY
        if (Math.hypot(dx, dy) > DISTANCIA_CANCELAMENTO) {
          estado.suprimirClique = true
          terminar()
        }
      }
      const soltar = () => {
        if (estado.concluido) return
        // Soltar depois de prender muito tempo (ou arrastar) cancela a espera
        // e não conta como toque, senão o dedo preso abria os detalhes.
        if (performance.now() - estado.inicio >= TOQUE_MS) estado.suprimirClique = true
        terminar()
      }
      estado.move = move
      estado.soltar = soltar
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', soltar)
      window.addEventListener('pointercancel', soltar)

      const tique = () => {
        const decorrido = performance.now() - estado.inicio
        const proximo = Math.min(1, decorrido / opcoesRef.current.duracaoMs)
        setProgresso(proximo)
        if (proximo >= 1) {
          concluir()
          return
        }
        estado.raf = requestAnimationFrame(tique)
      }
      estado.raf = requestAnimationFrame(tique)
      setSegurando(true)
    },
    [segurando, terminar, concluir],
  )

  const onClick = useCallback((evento: MouseEventReact) => {
    const estado = estadoRef.current
    if (estado.suprimirClique) {
      estado.suprimirClique = false
      evento.preventDefault()
      evento.stopPropagation()
      return
    }
    opcoesRef.current.aoTocar?.(evento)
  }, [])

  useEffect(() => {
    const estado = estadoRef.current
    return () => {
      if (estado.raf) cancelAnimationFrame(estado.raf)
      if (estado.move) window.removeEventListener('pointermove', estado.move)
      if (estado.soltar) {
        window.removeEventListener('pointerup', estado.soltar)
        window.removeEventListener('pointercancel', estado.soltar)
      }
    }
  }, [])

  return {
    progresso,
    segurando,
    propsSegurar: { onPointerDown, onClick },
  }
}
