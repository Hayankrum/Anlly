import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { X } from 'lucide-react'

type TipoToast = 'info' | 'sucesso' | 'erro'

interface AcaoToast {
  rotulo: string
  aoClicar: () => void
}

interface OpcoesToast {
  tipo?: TipoToast
  duracao?: number
  /** Botão opcional no toast (ex.: "Abrir configurações" num erro de cota). */
  acao?: AcaoToast
}

interface ContextoToast {
  mostrar: (mensagem: string, opcoes?: OpcoesToast) => void
}

interface Aviso {
  id: number
  mensagem: string
  tipo: TipoToast
  acao?: AcaoToast
}

const ToastContext = createContext<ContextoToast | null>(null)

let proximoId = 0

export function ToastProvider({ children }: PropsWithChildren) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const remover = useCallback((id: number) => {
    setAvisos((atual) => atual.filter((aviso) => aviso.id !== id))
  }, [])

  const mostrar = useCallback(
    (mensagem: string, opcoes?: OpcoesToast) => {
      proximoId += 1
      const id = proximoId
      const duracao = opcoes?.duracao ?? 4500
      setAvisos((atual) => [
        ...atual,
        { id, mensagem, tipo: opcoes?.tipo ?? 'info', acao: opcoes?.acao },
      ])
      if (duracao > 0) window.setTimeout(() => remover(id), duracao)
    },
    [remover],
  )

  const valor = useMemo(() => ({ mostrar }), [mostrar])

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toast-area" role="status" aria-live="polite">
        {avisos.map((aviso) => (
          <div key={aviso.id} className={`toast toast--${aviso.tipo}`}>
            <span className="toast-mensagem">{aviso.mensagem}</span>
            {aviso.acao ? (
              <button
                type="button"
                className="toast-acao"
                onClick={() => {
                  aviso.acao?.aoClicar()
                  remover(aviso.id)
                }}
              >
                {aviso.acao.rotulo}
              </button>
            ) : null}
            <button
              type="button"
              className="toast-fechar"
              aria-label="Fechar aviso"
              onClick={() => remover(aviso.id)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ContextoToast {
  const contexto = useContext(ToastContext)
  if (!contexto) throw new Error('useToast precisa estar dentro de ToastProvider')
  return contexto
}
