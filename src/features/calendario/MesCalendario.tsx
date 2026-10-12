import { CelulaDia } from './CelulaDia'
import { monthGrid, parseDate } from './datas'

interface MesCalendarioProps {
  year: number
  month: number
  label: string
  selectedDate: string
  today: string
  diasComItens: Set<string>
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onOpenYear: () => void
}

export function MesCalendario({
  year,
  month,
  label,
  selectedDate,
  today,
  diasComItens,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onOpenYear,
}: MesCalendarioProps) {
  const cells = monthGrid(year, month)

  return (
    <section className="month-calendar" aria-label="calendário">
      <header className="calendar-header">
        <button type="button" className="nav-button" onClick={onPrevMonth} aria-label="mês anterior">
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
        <button type="button" className="nav-button" onClick={onNextMonth} aria-label="próximo mês">
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

      <div className="days-grid">
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="day-cell is-empty" />
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
