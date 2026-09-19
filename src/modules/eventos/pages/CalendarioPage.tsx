'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useEventos } from '../useEventos'
import { alternarConclusaoEvento } from '../eventos.actions'
import type { Evento } from '../types'
import {
  dataParaInputDate,
  diasNoMes,
  formatarDataLonga,
  inicioDoMes,
  mesParaParam,
  nomeDiaSemanaCurto,
  nomeDoMes,
  paramParaMes,
  somarDias,
  somarMeses,
} from '../dateUtils'
import OfflineBanner from '@/components/OfflineBanner'
import ItemEvento from '../components/ItemEvento'

function agruparPorDia(eventos: Evento[]): Map<string, Evento[]> {
  const mapa = new Map<string, Evento[]>()
  for (const evento of eventos) {
    const chave = dataParaInputDate(new Date(evento.startsAt))
    const lista = mapa.get(chave)
    if (lista) lista.push(evento)
    else mapa.set(chave, [evento])
  }
  for (const lista of mapa.values()) {
    lista.sort(
      (a, b) => Number(a.done) - Number(b.done) || a.startsAt.localeCompare(b.startsAt)
    )
  }
  return mapa
}

export default function CalendarioPage({ mesInicial }: { mesInicial?: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [acaoError, setAcaoError] = useState('')

  const hoje = new Date()
  const hojeChave = dataParaInputDate(hoje)

  const [mes, setMes] = useState<Date>(() => paramParaMes(mesInicial) ?? inicioDoMes(hoje))
  const [diaSelecionado, setDiaSelecionado] = useState<string>(() => {
    const inicial = paramParaMes(mesInicial) ?? inicioDoMes(hoje)
    return inicial.getFullYear() === hoje.getFullYear() && inicial.getMonth() === hoje.getMonth()
      ? hojeChave
      : dataParaInputDate(inicial)
  })

  const { inicioGrade, totalCelulas } = useMemo(() => {
    const primeiro = inicioDoMes(mes)
    const deslocamento = primeiro.getDay()
    const celulas = Math.ceil((deslocamento + diasNoMes(mes)) / 7) * 7
    return { inicioGrade: somarDias(primeiro, -deslocamento), totalCelulas: celulas }
  }, [mes])

  const range = useMemo(
    () => ({
      from: inicioGrade.toISOString(),
      to: new Date(somarDias(inicioGrade, totalCelulas).getTime() - 1).toISOString(),
    }),
    [inicioGrade, totalCelulas]
  )

  const { eventos, loading, fromCache } = useEventos(range, refreshKey)
  const porDia = useMemo(() => agruparPorDia(eventos), [eventos])

  const celulas = useMemo(() => {
    const lista: Date[] = []
    for (let i = 0; i < totalCelulas; i++) lista.push(somarDias(inicioGrade, i))
    return lista
  }, [inicioGrade, totalCelulas])

  const eventosSelecionados = porDia.get(diaSelecionado) ?? []

  async function toggleDone(evento: Evento) {
    setAcaoError('')
    try {
      const result = await alternarConclusaoEvento(evento.id, !evento.done)
      if (result?.error) {
        setAcaoError(result.error)
        return
      }
      setRefreshKey((k) => k + 1)
    } catch {
      setAcaoError('Sem conexão. Tente novamente quando estiver online.')
    }
  }

  function atualizarUrl(novoMes: Date) {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/calendario?mes=${mesParaParam(novoMes)}`)
    }
  }

  function irParaMes(delta: number) {
    const novo = somarMeses(mes, delta)
    setMes(novo)
    const hojeEstaNoMes =
      novo.getFullYear() === hoje.getFullYear() && novo.getMonth() === hoje.getMonth()
    setDiaSelecionado(hojeEstaNoMes ? hojeChave : dataParaInputDate(novo))
    atualizarUrl(novo)
  }

  function irParaHoje() {
    const novo = inicioDoMes(hoje)
    setMes(novo)
    setDiaSelecionado(hojeChave)
    atualizarUrl(novo)
  }

  const botaoMes =
    'w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors'

  return (
    <div>
      <OfflineBanner fromCache={fromCache} />

      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold capitalize truncate" style={{ color: 'var(--text-primary)' }}>
            {nomeDoMes(mes.getMonth())} {mes.getFullYear()}
          </h1>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => irParaMes(-1)}
            className={botaoMes}
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={irParaHoje}
            className="h-9 px-3 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => irParaMes(1)}
            className={botaoMes}
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl p-2 md:p-3 mb-6"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="text-center text-[11px] font-medium py-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {nomeDiaSemanaCurto(i)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {celulas.map((dia) => {
            const chave = dataParaInputDate(dia)
            const pertence = dia.getMonth() === mes.getMonth()
            const ehHoje = chave === hojeChave
            const selecionado = chave === diaSelecionado
            const doDia = porDia.get(chave) ?? []

            return (
              <button
                key={chave}
                type="button"
                onClick={() => setDiaSelecionado(chave)}
                className="rounded-lg min-h-[52px] py-1 flex flex-col items-center transition-colors"
                style={{
                  backgroundColor: selecionado ? 'var(--btn-secondary-bg)' : 'transparent',
                  border: '1px solid',
                  borderColor: selecionado ? 'var(--text-tertiary)' : 'transparent',
                  opacity: pertence ? 1 : 0.4,
                }}
                aria-label={`Dia ${chave}, ${doDia.length} evento(s)`}
              >
                <span
                  className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                  style={{
                    backgroundColor: ehHoje ? 'var(--btn-primary-bg)' : 'transparent',
                    color: ehHoje ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                  }}
                >
                  {dia.getDate()}
                </span>
                <span className="flex items-center justify-center gap-[3px] mt-0.5 h-2">
                  {doDia.slice(0, 3).map((evento) => (
                    <span
                      key={evento.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: evento.done ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                      }}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {acaoError && (
        <p
          className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2 mb-4"
          style={{ color: '#f87171' }}
        >
          {acaoError}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {formatarDataLonga(new Date(`${diaSelecionado}T00:00`))}
        </h2>
        <Link
          href={`/eventos/novo?data=${diaSelecionado}`}
          className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors flex-shrink-0"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          + Evento
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              <div className="h-4 w-1/2 rounded bg-zinc-600/20 mb-2" />
              <div className="h-3 w-1/3 rounded bg-zinc-600/20" />
            </div>
          ))}
        </div>
      ) : eventosSelecionados.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Nenhum evento neste dia.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {eventosSelecionados.map((evento) => (
            <ItemEvento
              key={evento.id}
              evento={evento}
              onToggle={toggleDone}
              mostrarData={false}
            />
          ))}
        </div>
      )}

      <Link
        href="/eventos"
        className="text-sm hover:underline inline-block mt-6"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Ver todos os eventos →
      </Link>
    </div>
  )
}
