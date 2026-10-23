import { CelulaDia } from './CelulaDia'
import { calendarWeekdayLabels, parseDate } from './datas'

const WEEKDAYS = calendarWeekdayLabels()

interface SemanaCalendarioProps {
  dates: string[]
  today: string
  selectedDate: string
  diasComItens: Set<string>
  onSelectDate: (date: string) => void
}

export function SemanaCalendario({
  dates,
  today,
  selectedDate,
  diasComItens,
  onSelectDate,
}: SemanaCalendarioProps) {
  return (
    <section className="month-calendar week-calendar" aria-label="calendário da semana">
      <div className="weekday-row" aria-hidden="true">
        {WEEKDAYS.map((dia) => (
          <span key={dia} className="weekday-label">
            {dia}
          </span>
        ))}
      </div>

      <div className="days-grid">
        {dates.map((date) => {
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
