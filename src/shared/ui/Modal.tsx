import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface ModalProps {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  rodape?: ReactNode
  largura?: 'padrao' | 'estreito'
}

const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ aberto, titulo, onFechar, children, rodape, largura = 'padrao' }: ModalProps) {
  const tituloId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const focoAnterior = useRef<HTMLElement | null>(null)
  // Mantém a referência mais recente sem re-renderizar o effect a cada tecla
  // (onFechar costuma ser uma arrow nova a cada render do pai).
  const aoFecharRef = useRef(onFechar)
  aoFecharRef.current = onFechar

  useEffect(() => {
    if (!aberto) return undefined

    focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialogo = dialogRef.current
    dialogo?.focus()

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        aoFecharRef.current()
        return
      }
      if (evento.key !== 'Tab' || !dialogRef.current) return
      const focaveis = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS),
      )
      if (focaveis.length === 0) {
        evento.preventDefault()
        dialogRef.current.focus()
        return
      }
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const atual = document.activeElement
      if (evento.shiftKey && (atual === primeiro || atual === dialogRef.current)) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
      focoAnterior.current?.focus()
    }
  }, [aberto])

  if (!aberto) return null

  return createPortal(
    <div
      className="modal-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar()
      }}
    >
      <div
        className={`modal-dialogo modal-dialogo--${largura}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="modal-cabecalho">
          <h2 className="modal-titulo" id={tituloId}>
            {titulo}
          </h2>
          <button type="button" className="modal-fechar" aria-label="Fechar" onClick={onFechar}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-corpo">{children}</div>
        {rodape ? <footer className="modal-rodape">{rodape}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}
