import { CelulaDia } from './CelulaDia'
import { monthGrid, parseDate } from './datas'

interface MesCalendarioProps {
  year: number
  month: number
  selectedDate: string
  today: string
  diasComItens: Set<string>
  onSelectDate: (date: string) => void
}

export function MesCalendario({
  year,
  month,
  selectedDate,
  today,
  diasComItens,
  onSelectDate,
}: MesCalendarioProps) {
  const cells = monthGrid(year, month)

  return (
    <section className="month-calendar" aria-label="calendário">
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
