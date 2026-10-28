import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { useItems } from '../items/useItems'
import { usePodeEditar } from '../conta/usePodeEditar'
import * as itemsRepo from '../items/items.repo'
import type { EntradaItem } from '../items/items.repo'
import { ItemForm } from '../items/ItemForm'
import { buildItemDia, type ItemDia } from './itens-dia'
import { useCalendar } from './useCalendar'
import { MesCalendario } from './MesCalendario'
import { SemanaCalendario } from './SemanaCalendario'
import { VistaAno } from './VistaAno'
import { MapaHoras } from './MapaHoras'
import { dayLabel, weekLabel } from './datas'
import './calendario.css'

type VistaCalendario = 'dia' | 'semana' | 'mes'

const VISTAS: { valor: VistaCalendario; rotulo: string }[] = [
  { valor: 'dia', rotulo: 'Dia' },
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'mes', rotulo: 'Mês' },
]

/** Calendário com vistas por dia, semana e mês, além do mapa de horas. */
export function CalendarioPage() {
  const navigate = useNavigate()
  const podeEditar = usePodeEditar()
  const itens = useItems()

  const itensDia = useMemo(() => buildItemDia(itens), [itens])
  const calendar = useCalendar(itensDia)

  const { mostrar } = useToast()

  const [vista, setVista] = useState<VistaCalendario>('mes')
  const [vistaAno, setVistaAno] = useState(false)
  /** true = o mapa de horas está filtrado no dia marcado (o calendário continua visível). */
  const [filtrandoDia, setFiltrandoDia] = useState(false)
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<ItemDia | null>(null)
  const [excluindo, setExcluindo] = useState<ItemDia | null>(null)

  const dayItems = calendar.dayItems
  const weekItems = calendar.weekItems
  const monthItems = calendar.monthItems

  const abrirItem = useCallback(
    (itemId: string) => {
      navigate(`/itens/${itemId}`)
    },
    [navigate],
  )

  const trocarVista = useCallback((valor: VistaCalendario) => {
    setVista(valor)
    setVistaAno(false)
    setFiltrandoDia(false)
  }, [])

  /**
   * Marca o dia na célula do calendário e filtra o mapa de horas para ele,
   * sem trocar a vista — o calendário continua visível. Clicar de novo no
   * mesmo dia limpa o filtro e volta a mostrar a semana/mês inteiro.
   */
  const selecionarDia = useCallback(
    (date: string) => {
      if (date === calendar.selectedDate && filtrandoDia) {
        setFiltrandoDia(false)
        return
      }
      calendar.selectDate(date)
      setFiltrandoDia(true)
    },
    [calendar, filtrandoDia],
  )

  async function salvarNovo(entrada: EntradaItem) {
    if (!podeEditar) return
    try {
      await itemsRepo.criar(entrada)
      setCriando(false)
      mostrar('Item criado', { tipo: 'sucesso' })
    } catch (erro) {
      if (erro instanceof ErroCotaExcedida) {
        mostrar(erro.message, {
          tipo: 'erro',
          duracao: 10000,
          acao: { rotulo: 'Ver armazenamento', aoClicar: () => navigate('/config') },
        })
        return
      }
      mostrar('Não foi possível criar o item', { tipo: 'erro' })
    }
  }

  async function salvarEdicao(entrada: EntradaItem) {
    if (!podeEditar || !editando) return
    try {
      await itemsRepo.atualizar(editando.itemId, entrada)
      setEditando(null)
      mostrar('Item atualizado', { tipo: 'sucesso' })
    } catch (erro) {
      if (erro instanceof ErroCotaExcedida) {
        mostrar(erro.message, {
          tipo: 'erro',
          duracao: 10000,
          acao: { rotulo: 'Ver armazenamento', aoClicar: () => navigate('/config') },
        })
        return
      }
      mostrar('Não foi possível atualizar o item', { tipo: 'erro' })
    }
  }

  async function confirmarExclusao() {
    if (!podeEditar || !excluindo) return
    try {
      await itemsRepo.excluir(excluindo.itemId)
      setExcluindo(null)
      mostrar('Item excluído', { tipo: 'info' })
    } catch (erro) {
      if (erro instanceof ErroCotaExcedida) {
        mostrar(erro.message, {
          tipo: 'erro',
          duracao: 10000,
          acao: { rotulo: 'Ver armazenamento', aoClicar: () => navigate('/config') },
        })
        return
      }
      mostrar('Não foi possível excluir o item', { tipo: 'erro' })
    }
  }

  if (!podeEditar) {
    return (
      <div className="pagina calendario-pagina">
        <div className="lista-vazia">
          <p className="lista-vazia-titulo">Seu calendário está protegido</p>
          <p>Os itens deste aparelho só aparecem com uma conta conectada — nada é apagado ao sair.</p>
        </div>
      </div>
    )
  }

  const emVistaAno = vista === 'mes' && vistaAno
  const rotulo = emVistaAno
    ? `${calendar.year} ▾`
    : vista === 'mes'
      ? calendar.label
      : vista === 'semana'
        ? weekLabel(calendar.weekDates)
        : dayLabel(calendar.selectedDate)

  const irParaAnterior = emVistaAno
    ? calendar.goToPrevYear
    : vista === 'mes'
      ? calendar.goToPrevMonth
      : vista === 'semana'
        ? calendar.goToPrevWeek
        : calendar.goToPrevDay

  const irParaProximo = emVistaAno
    ? calendar.goToNextYear
    : vista === 'mes'
      ? calendar.goToNextMonth
      : vista === 'semana'
        ? calendar.goToNextWeek
        : calendar.goToNextDay

  const rotuloAnterior = emVistaAno
    ? 'ano anterior'
    : vista === 'mes'
      ? 'mês anterior'
      : vista === 'semana'
        ? 'semana anterior'
        : 'dia anterior'

  const rotuloProximo = emVistaAno
    ? 'próximo ano'
    : vista === 'mes'
      ? 'próximo mês'
      : vista === 'semana'
        ? 'próxima semana'
        : 'próximo dia'

  return (
    <div className="pagina calendario-pagina">
      <div className="calendario-toolbar">
        <header className="calendar-header">
          <button
            type="button"
            className="nav-button"
            onClick={irParaAnterior}
            aria-label={rotuloAnterior}
          >
            ‹
          </button>
          {vista === 'mes' ? (
            <button
              type="button"
              className="calendar-title"
              onClick={() => setVistaAno(!emVistaAno)}
              aria-label={emVistaAno ? 'voltar ao mês' : 'ver mapa do ano'}
            >
              {rotulo}
            </button>
          ) : (
            <h2 className="calendar-title calendar-title--static">{rotulo}</h2>
          )}
          <button
            type="button"
            className="nav-button"
            onClick={irParaProximo}
            aria-label={rotuloProximo}
          >
            ›
          </button>
        </header>

        <div className="segmentado calendario-vistas" role="group" aria-label="Vista do calendário">
          {VISTAS.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={vista === opcao.valor}
              onClick={() => trocarVista(opcao.valor)}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      {vista === 'dia' && (
        <MapaHoras
          date={calendar.selectedDate}
          items={dayItems}
          onOpenItem={(item) => abrirItem(item.itemId)}
          onEditItem={(item) => setEditando(item)}
          onDeleteItem={(item) => setExcluindo(item)}
        />
      )}

      {vista === 'semana' && (
        <SemanaCalendario
          dates={calendar.weekDates}
          today={calendar.today}
          selectedDate={calendar.selectedDate}
          diasComItens={calendar.diasComItens}
          onSelectDate={selecionarDia}
        />
      )}

      {vista === 'mes' &&
        (emVistaAno ? (
          <VistaAno
            year={calendar.year}
            today={calendar.today}
            selectedDate={calendar.selectedDate}
            diasComItens={calendar.diasComItens}
            onSelectDate={(date) => {
              calendar.goTo(date)
              setVistaAno(false)
              setFiltrandoDia(true)
            }}
          />
        ) : (
          <MesCalendario
            year={calendar.year}
            month={calendar.month}
            selectedDate={calendar.selectedDate}
            today={calendar.today}
            diasComItens={calendar.diasComItens}
            onSelectDate={selecionarDia}
          />
        ))}

      {vista !== 'dia' && (
        <>
          <section className="timeline-section" aria-labelledby="titulo-mapa-horas">
            <header className="timeline-cabecalho">
              <h2 className="cartao-titulo" id="titulo-mapa-horas">
                Mapa de horas
              </h2>
              <span className="timeline-date">
                {filtrandoDia
                  ? dayLabel(calendar.selectedDate)
                  : vista === 'semana'
                    ? weekLabel(calendar.weekDates)
                    : calendar.label}
              </span>
            </header>
          </section>
          <MapaHoras
            date={filtrandoDia ? calendar.selectedDate : undefined}
            dates={!filtrandoDia && vista === 'semana' ? calendar.weekDates : undefined}
            items={
              filtrandoDia
                ? dayItems
                : vista === 'semana'
                  ? weekItems
                  : monthItems
            }
            onOpenItem={(item) => abrirItem(item.itemId)}
            onEditItem={(item) => setEditando(item)}
            onDeleteItem={(item) => setExcluindo(item)}
          />
        </>
      )}

      {criando || editando ? null : (
        <button
          type="button"
          className="fab"
          aria-label="Novo item"
          onClick={() => setCriando(true)}
        >
          <Plus size={26} aria-hidden="true" />
        </button>
      )}

      <Modal
        aberto={criando}
        titulo="Novo item"
        onFechar={() => setCriando(false)}
        largura="estreito"
      >
        {criando ? <ItemForm aoCancelar={() => setCriando(false)} aoSalvar={salvarNovo} /> : null}
      </Modal>

      <Modal
        aberto={editando !== null}
        titulo="Editar item"
        onFechar={() => setEditando(null)}
        largura="estreito"
      >
        {editando ? (
          <ItemForm
            item={itens.find((item) => item.id === editando.itemId)}
            aoCancelar={() => setEditando(null)}
            aoSalvar={salvarEdicao}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        aberto={excluindo !== null}
        titulo="Excluir item"
        mensagem={
          excluindo
            ? `O item "${excluindo.titulo}" será removido da lista. Esta ação não pode ser desfeita.`
            : ''
        }
        textoConfirmar="Excluir"
        perigo
        aoConfirmar={() => void confirmarExclusao()}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  )
}
