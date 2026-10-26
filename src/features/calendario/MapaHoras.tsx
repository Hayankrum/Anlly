import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { CheckSquare, Pencil, Square, Trash2 } from 'lucide-react'
import type { ItemDia } from './itens-dia'

/** Pixels por hora — dá folga vertical para os marcadores não ficarem colados. */
const HOUR_HEIGHT = 64
/** Altura mínima de um bloco — um item curto ainda ocupa essa faixa. */
const MIN_BLOCK_PX = 56
/** A mesma altura mínima em minutos, usada para detectar colisões reais. */
const MIN_BLOCK_MINUTES = Math.ceil((MIN_BLOCK_PX / HOUR_HEIGHT) * 60)
/** Folga vertical entre dois blocos. */
const BLOCK_GAP = 4
/** Duração padrão quando o item não tem horário de fim. */
const DURACAO_PADRAO = 30

interface MapaHorasProps {
  date?: string
  dates?: string[]
  items: ItemDia[]
  onOpenItem: (item: ItemDia) => void
  onEditItem: (item: ItemDia) => void
  onDeleteItem: (item: ItemDia) => void
}

function hourOf(time: string): number | null {
  const hour = Number(time.slice(0, 2))
  const minute = Number(time.slice(3, 5))
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (hour > 23 || minute > 59) return null
  return hour
}

interface Span {
  item: ItemDia
  startMin: number
  duration: number
  /** fim da área visual (com a altura mínima), usado só para achar sobreposição */
  overlapEnd: number
}

interface PlacedEvent {
  item: ItemDia
  top: number
  height: number
  col: number
  cols: number
}

/**
 * Agrupa itens sobrepostos em clusters e distribui colunas, para compromissos
 * concorrentes ficarem lado a lado em vez de empilhados.
 */
function layoutColumns(items: ItemDia[]): { span: Span; col: number; cols: number }[] {
  const spans: Span[] = items
    .map((item) => {
      const hora = item.hora ?? '00:00'
      const startMin = (hourOf(hora) ?? 0) * 60 + Number(hora.slice(3, 5) || 0)
      const duration = DURACAO_PADRAO
      return {
        item,
        startMin,
        duration,
        overlapEnd: Math.max(startMin + duration, startMin + MIN_BLOCK_MINUTES),
      }
    })
    .sort((a, b) => a.startMin - b.startMin || a.overlapEnd - b.overlapEnd)

  const out: { span: Span; col: number; cols: number }[] = []
  let cluster: Span[] = []
  let clusterEnd = -Infinity

  const flush = () => {
    if (cluster.length === 0) return
    const colEnds: number[] = []
    const assigned = cluster.map((span) => {
      let col = colEnds.findIndex((end) => end <= span.startMin)
      if (col === -1) col = colEnds.length
      colEnds[col] = span.overlapEnd
      return { span, col }
    })
    for (const entry of assigned) out.push({ ...entry, cols: colEnds.length })
    cluster = []
    clusterEnd = -Infinity
  }

  for (const span of spans) {
    if (cluster.length > 0 && span.startMin >= clusterEnd) flush()
    cluster.push(span)
    clusterEnd = Math.max(clusterEnd, span.overlapEnd)
  }
  flush()

  return out
}

/** Mapa hora a hora do dia/semana/mês selecionado: a agenda, não uma lista. */
export function MapaHoras({ date, dates, items, onOpenItem, onEditItem, onDeleteItem }: MapaHorasProps) {
  const today = useMemo(() => {
    const agora = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`
  }, [])

  const comHora = useMemo(() => items.filter((item) => item.hora !== null), [items])

  const windowHours = useMemo(() => {
    let start = 24
    let end = -1
    for (const item of comHora) {
      const hora = item.hora
      if (hora === null) continue
      const hour = hourOf(hora)
      if (hour === null) continue
      start = Math.min(start, hour)
      end = Math.max(end, hour + 1)
    }
    if (start > end) {
      if (date === today) {
        const now = new Date().getHours()
        start = Math.max(0, now - 1)
        end = Math.min(23, now + 4)
      } else {
        start = 7
        end = 20
      }
    }
    start = Math.max(0, start - 1)
    end = Math.min(23, Math.max(end, start + 3))
    const hours: number[] = []
    for (let hour = start; hour <= end; hour++) hours.push(hour)
    return { start, hours }
  }, [comHora, date, today])

  const trackHeight = windowHours.hours.length * HOUR_HEIGHT
  const windowStartMin = windowHours.start * 60

  const placed = useMemo<PlacedEvent[]>(() => {
    const windowEndMin = windowStartMin + trackHeight * (60 / HOUR_HEIGHT)
    const list = layoutColumns(comHora).map(({ span, col, cols }) => {
      const clippedStart = Math.max(span.startMin, windowStartMin)
      const clippedEnd = Math.min(span.startMin + span.duration, windowEndMin)
      const top = ((clippedStart - windowStartMin) / 60) * HOUR_HEIGHT
      const height = Math.max(
        ((Math.max(clippedEnd, clippedStart + 15) - clippedStart) / 60) * HOUR_HEIGHT,
        MIN_BLOCK_PX,
      )
      return { item: span.item, top, height, col, cols }
    })

    // Nunca deixa um bloco invadir o próximo da mesma coluna e reserva folga.
    list.sort((a, b) => a.col - b.col || a.top - b.top)
    for (let i = 0; i < list.length; i++) {
      const current = list[i]
      const next = list[i + 1]
      if (next && next.col === current.col && next.top > current.top) {
        current.height = Math.min(current.height, next.top - current.top)
      }
      current.height = Math.max(current.height - BLOCK_GAP, 28)
    }
    return list
  }, [comHora, windowStartMin, trackHeight])

  const now = new Date()
  const nowTop =
    date && date === today
      ? ((now.getHours() * 60 + now.getMinutes() - windowStartMin) / 60) * HOUR_HEIGHT
      : null

  const viewportRef = useRef<HTMLDivElement>(null)
  const scrolledDateRef = useRef<string | null>(null)

  // Ao abrir um dia, a área começa na hora atual em vez do topo da janela.
  useEffect(() => {
    const el = viewportRef.current
    const chave = date ?? dates?.join(',') ?? ''
    if (!el || scrolledDateRef.current === chave) return
    scrolledDateRef.current = chave
    const target = nowTop === null ? 0 : nowTop - el.clientHeight * 0.4
    el.scrollTop = Math.max(0, Math.min(target, el.scrollHeight - el.clientHeight))
  }, [date, dates, nowTop])

  const semHora = items.filter((item) => item.hora === null)

  return (
    <div className="day-timeline">
      {semHora.length > 0 && (
        <ul className="timeline-sem-hora" aria-label="itens sem horário">
          {semHora.map((item) => (
            <li key={item.id} className="timeline-sem-hora-linha">
              <button
                type="button"
                className={`timeline-sem-hora-item${item.concluido ? ' is-done' : ''}`}
                onClick={() => onOpenItem(item)}
              >
                {item.concluido ? (
                  <CheckSquare size={15} aria-hidden="true" />
                ) : (
                  <Square size={15} aria-hidden="true" />
                )}
                <span className="timeline-sem-hora-texto">
                  <span className="timeline-sem-hora-titulo">{item.titulo}</span>
                  {item.descricao ? <span className="timeline-sem-hora-descricao">{item.descricao}</span> : null}
                </span>
              </button>
              <div className="timeline-sem-hora-acoes">
                <button
                  type="button"
                  className="timeline-sem-hora-acao"
                  aria-label={`Editar ${item.titulo}`}
                  onClick={(evento) => {
                    evento.stopPropagation()
                    onEditItem(item)
                  }}
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="timeline-sem-hora-acao timeline-sem-hora-acao--perigo"
                  aria-label={`Excluir ${item.titulo}`}
                  onClick={(evento) => {
                    evento.stopPropagation()
                    onDeleteItem(item)
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="timeline-viewport" ref={viewportRef}>
        <div className="timeline-scroll" style={{ height: trackHeight }}>
          <div className="timeline-gutter">
            {windowHours.hours.map((hour, index) => (
              <span key={hour} className="timeline-hour" style={{ top: index * HOUR_HEIGHT }}>
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          <div className="timeline-track">
            {windowHours.hours.map((hour, index) => (
              <span
                key={hour}
                className="timeline-rule"
                style={{ top: index * HOUR_HEIGHT }}
                aria-hidden="true"
              />
            ))}

            {nowTop !== null && nowTop >= 0 && nowTop <= trackHeight && (
              <span className="timeline-now" style={{ top: nowTop }} aria-hidden="true">
                <span className="timeline-now-dot" />
              </span>
            )}

            {placed.map(({ item, top, height, col, cols }) => {
              const style = {
                top,
                height,
                '--col': String(col),
                '--cols': String(cols),
                '--gap': cols > 1 ? '8px' : '0px',
              } as CSSProperties
              const classNames = ['timeline-event']
              if (item.concluido) classNames.push('is-done')
              if (cols > 1) classNames.push('is-split')
              if (cols >= 3) classNames.push('is-narrow')

              return (
                <div
                  key={item.id}
                  className={classNames.join(' ')}
                  style={style}
                  role="group"
                  aria-label={`${item.titulo}, ${item.hora}${item.concluido ? ', concluído' : ''}`}
                >
                  <button
                    type="button"
                    className="timeline-event-main"
                    onClick={() => onOpenItem(item)}
                  >
                    <span className="timeline-event-icon">
                      {item.concluido ? (
                        <CheckSquare size={16} aria-hidden="true" />
                      ) : (
                        <Square size={16} aria-hidden="true" />
                      )}
                    </span>
                    <span className="timeline-event-body">
                      <span className="timeline-event-title">{item.titulo}</span>
                      {item.descricao ? (
                        <span className="timeline-event-descricao">{item.descricao}</span>
                      ) : null}
                      <span className="timeline-event-time">{item.hora}</span>
                    </span>
                  </button>
                  <div className="timeline-event-acoes">
                    <button
                      type="button"
                      className="timeline-event-acao"
                      aria-label={`Editar ${item.titulo}`}
                      onClick={(evento) => {
                        evento.stopPropagation()
                        onEditItem(item)
                      }}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="timeline-event-acao timeline-event-acao--perigo"
                      aria-label={`Excluir ${item.titulo}`}
                      onClick={(evento) => {
                        evento.stopPropagation()
                        onDeleteItem(item)
                      }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )
            })}

            {comHora.length === 0 && semHora.length === 0 && (
              <p className="timeline-empty">Nenhum item agendado nesta data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
