import { CelulaDia } from './CelulaDia'
import { parseDate } from './datas'

interface SemanaCalendarioProps {
  /** "21 – 27 de Setembro" */
  label: string
  /** segunda..domingo */
  weekDays: string[]
  selectedDate: string
  today: string
  diasComItens: Set<string>
  onSelectDate: (date: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onOpenYear: () => void
}

export function SemanaCalendario({
  label,
  weekDays,
  selectedDate,
  today,
  diasComItens,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onOpenYear,
}: SemanaCalendarioProps) {
  return (
    <section className="month-calendar" aria-label="semana">
      <header className="calendar-header">
        <button type="button" className="nav-button" onClick={onPrevWeek} aria-label="semana anterior">
          ‹
        </button>
        <button
          type="button"
          className="calendar-title"
          onClick={onOpenYear}
          aria-label="ver mapa do ano"
        >
          {label}
        </button>
        <button type="button" className="nav-button" onClick={onNextWeek} aria-label="próxima semana">
          ›
        </button>
      </header>

      <div className="weekday-row" aria-hidden="true">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dia) => (
          <span key={dia} className="weekday-label">
            {dia}
          </span>
        ))}
      </div>

      <div className="days-grid week-grid">
        {weekDays.map((date) => {
          const parts = parseDate(date)
          return (
            <CelulaDia
              key={date}
              data={date}
              numeroDia={parts?.day ?? Number(date.slice(-2))}
              ehHoje={date === today}
              ehSelecionado={date === selectedDate}
              temItens={diasComItens.has(date)}
              aoSelecionar={onSelectDate}
            />
          )
        })}
      </div>
    </section>
  )
}
