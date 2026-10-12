import { formatDateLong } from './datas'

interface NavegadorDiaProps {
  date: string
  onPrevDay: () => void
  onNextDay: () => void
  onOpenYear: () => void
}

/** Cabeçalho da vista de dia: ‹ 21 de Setembro › (título abre o mapa do ano). */
export function NavegadorDia({ date, onPrevDay, onNextDay, onOpenYear }: NavegadorDiaProps) {
  return (
    <section className="month-calendar" aria-label="dia">
      <header className="calendar-header">
        <button type="button" className="nav-button" onClick={onPrevDay} aria-label="dia anterior">
          ‹
        </button>
        <button
          type="button"
          className="calendar-title"
          onClick={onOpenYear}
          aria-label="ver mapa do ano"
        >
          {formatDateLong(date)}
        </button>
        <button type="button" className="nav-button" onClick={onNextDay} aria-label="próximo dia">
          ›
        </button>
      </header>
    </section>
  )
}
