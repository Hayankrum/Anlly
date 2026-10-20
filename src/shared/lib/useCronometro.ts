import { useEffect, useState } from 'react'

/**
 * Tempo total do cronômetro de um item: o já acumulado (`tempoDecorridoMs`) mais
 * a sessão em curso (`timerIniciadoEm`). Re-renderiza a cada segundo enquanto a
 * sessão estiver rodando; quando parada devolve o acumulado sem tiques.
 */
export function useCronometro(
  tempoDecorridoMs: number | undefined,
  timerIniciadoEm: number | undefined,
): number {
  const [agora, setAgora] = useState(() => Date.now())
  const rodando = timerIniciadoEm !== undefined

  useEffect(() => {
    if (!rodando) return
    setAgora(Date.now())
    const id = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [rodando])

  const acumulado = tempoDecorridoMs ?? 0
  if (timerIniciadoEm === undefined) return acumulado
  return acumulado + Math.max(0, agora - timerIniciadoEm)
}
