import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useItems } from '../items/useItems'
import { usePodeEditar } from '../conta/usePodeEditar'
import { buildItemDia } from './itens-dia'
import { useCalendar } from './useCalendar'
import { MesCalendario } from './MesCalendario'
import { VistaAno } from './VistaAno'
import { MapaHoras } from './MapaHoras'
import { formatarDataISO } from '../../shared/lib/date'
import './calendario.css'

/** Calendário mensal com vista por ano e o mapa de horas do dia selecionado. */
export function CalendarioPage() {
  const navigate = useNavigate()
  const podeEditar = usePodeEditar()
  const itens = useItems()

  const itensDia = useMemo(() => buildItemDia(itens), [itens])
  const calendar = useCalendar(itensDia)

  const [vistaAno, setVistaAno] = useState(false)

  const dayItems = calendar.dayItems

  const abrirItem = useCallback(
    (itemId: string) => {
      navigate(`/itens/${itemId}`)
    },
    [navigate],
  )

  if (!podeEditar) {
    return (
      <div className="pagina">
        <div className="lista-vazia">
          <p className="lista-vazia-titulo">Seu calendário está protegido</p>
          <p>Os itens deste aparelho só aparecem com uma conta conectada — nada é apagado ao sair.</p>
          <Link className="btn btn--primario" to="/conta">
            Entrar / Criar conta
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pagina">
      {vistaAno ? (
        <VistaAno
          year={calendar.year}
          today={calendar.today}
          selectedDate={calendar.selectedDate}
          diasComItens={calendar.diasComItens}
          onSelectDate={(date) => {
            calendar.goTo(date)
            setVistaAno(false)
          }}
          onPrevYear={calendar.goToPrevYear}
          onNextYear={calendar.goToNextYear}
          onClose={() => setVistaAno(false)}
        />
      ) : (
        <MesCalendario
          year={calendar.year}
          month={calendar.month}
          label={calendar.label}
          selectedDate={calendar.selectedDate}
          today={calendar.today}
          diasComItens={calendar.diasComItens}
          onSelectDate={calendar.selectDate}
          onPrevMonth={calendar.goToPrevMonth}
          onNextMonth={calendar.goToNextMonth}
          onOpenYear={() => setVistaAno(true)}
        />
      )}

      {!vistaAno && (
        <section className="timeline-section" aria-labelledby="titulo-mapa-horas">
          <header className="timeline-cabecalho">
            <h2 className="cartao-titulo" id="titulo-mapa-horas">
              Mapa de horas
            </h2>
            <span className="timeline-date">{formatarDataISO(calendar.selectedDate)}</span>
          </header>
          <MapaHoras
            date={calendar.selectedDate}
            items={dayItems}
            onOpenItem={(item) => abrirItem(item.itemId)}
          />
        </section>
      )}
    </div>
  )
}
