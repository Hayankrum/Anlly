'use client'

import Link from 'next/link'
import type { Evento } from '../types'
import { formatarHora, formatarQuandoEvento } from '../dateUtils'

interface Props {
  evento: Evento
  onToggle: (evento: Evento) => void
  mostrarData?: boolean
}

export default function ItemEvento({ evento, onToggle, mostrarData = true }: Props) {
  const temLocal = !!evento.locationText || (evento.latitude != null && evento.longitude != null)

  let quando: string
  if (mostrarData) {
    quando = formatarQuandoEvento(
      new Date(evento.startsAt),
      evento.endsAt ? new Date(evento.endsAt) : null,
      evento.allDay,
      evento.dias ?? null
    )
  } else if (evento.allDay) {
    quando = 'Dia inteiro'
  } else {
    const starts = new Date(evento.startsAt)
    quando = evento.endsAt
      ? `${formatarHora(starts)} – ${formatarHora(new Date(evento.endsAt))}`
      : formatarHora(starts)
  }

  return (
    <div
      className="rounded-lg p-4 flex items-center gap-3"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderLeft: `4px solid ${evento.color ?? '#3b82f6'}`,
        opacity: evento.done ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={evento.done}
        onChange={() => onToggle(evento)}
        className="w-5 h-5 cursor-pointer flex-shrink-0"
        aria-label={evento.done ? 'Reabrir evento' : 'Marcar como concluído'}
      />
      <Link href={`/eventos/${evento.id}`} className="flex-1 min-w-0 block">
        <p
          className={`font-medium text-sm leading-tight ${evento.done ? 'line-through' : ''}`}
          style={{ color: 'var(--text-primary)' }}
        >
          {evento.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {temLocal && '📍 '}
          {quando}
        </p>
      </Link>
    </div>
  )
}
