import { getDaysInMonth, makeDate, monthLeadingBlanks, parseDate } from './datas'

const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

interface VistaAnoProps {
  year: number
  today: string
  selectedDate: string
  diasComItens: Set<string>
  onSelectDate: (date: string) => void
  onPrevYear: () => void
  onNextYear: () => void
  onClose: () => void
}

export function VistaAno({
  year,
  today,
  selectedDate,
  diasComItens,
  onSelectDate,
  onPrevYear,
  onNextYear,
  onClose,
}: VistaAnoProps) {
  const selectedParts = parseDate(selectedDate)
  const miniWeekdays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

  return (
    <section className="year-view" aria-label={`mapa do ano ${year}`}>
      <header className="calendar-header">
        <button type="button" className="nav-button" onClick={onPrevYear} aria-label="ano anterior">
          ‹
        </button>
        <button type="button" className="calendar-title year-title" onClick={onClose} aria-label="voltar ao mês">
          {year} ▾
        </button>
        <button type="button" className="nav-button" onClick={onNextYear} aria-label="próximo ano">
          ›
        </button>
      </header>

      <div className="year-grid">
        {Array.from({ length: 12 }, (_, idx) => {
          const month = idx + 1
          const isCurrentMonth = selectedParts?.year === year && selectedParts?.month === month
          const daysInMonth = getDaysInMonth(year, month)
          const leading = monthLeadingBlanks(year, month)

          return (
            <div key={month} className={`mini-month${isCurrentMonth ? ' is-current' : ''}`}>
              <span className="mini-month-name">{MONTH_SHORT[idx]}</span>
              <div className="mini-weekdays" aria-hidden="true">
                {miniWeekdays.map((w, i) => (
                  <span key={`${w}-${i}`} className="mini-weekday">
                    {w}
                  </span>
                ))}
              </div>
              <div className="mini-grid">
                {Array.from({ length: 42 }, (_, cell) => {
                  const day = cell - leading + 1
                  if (day < 1 || day > daysInMonth) {
                    return <span key={cell} className="mini-day is-empty" />
                  }
                  const date = makeDate(year, month, day)
                  const temItem = diasComItens.has(date)
                  const classNames = ['mini-day']
                  if (date === today) classNames.push('is-today')
                  if (date === selectedDate) classNames.push('is-selected')
                  return (
                    <button
                      key={cell}
                      type="button"
                      className={classNames.join(' ')}
                      onClick={() => onSelectDate(date)}
                      aria-label={`${day} de ${MONTH_SHORT[idx]}`}
                    >
                      <span>{day}</span>
                      <span className="mini-dot" aria-hidden="true" data-tem-item={temItem || undefined} />
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
