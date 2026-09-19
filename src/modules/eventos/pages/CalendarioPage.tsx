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

function agruparPorMes(
  eventos: Evento[]
): Map<number, Map<number, Map<number, Evento[]>>> {
  const mapa = new Map<number, Map<number, Map<number, Evento[]>>>()
  for (const evento of eventos) {
    const d = new Date(evento.startsAt)
    const ano = d.getFullYear()
    const mes = d.getMonth()
    const dia = d.getDate()
    const porMes = mapa.get(ano) ?? new Map<number, Map<number, Evento[]>>()
    const porDia = porMes.get(mes) ?? new Map<number, Evento[]>()
    const lista = porDia.get(dia) ?? []
    lista.push(evento)
    porDia.set(dia, lista)
    porMes.set(mes, porDia)
    mapa.set(ano, porMes)
  }
  return mapa
}

export default function CalendarioPage({ mesInicial }: { mesInicial?: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [acaoError, setAcaoError] = useState('')

  const hoje = new Date()
  const hojeChave = dataParaInputDate(hoje)

  const [mes, setMes] = useState<Date>(() => paramParaMes(mesInicial) ?? inicioDoMes(hoje))
  const [modo, setModo] = useState<'mes' | 'ano'>('mes')
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

  const range = useMemo(() => {
    if (modo === 'ano') {
      const ano = mes.getFullYear()
      return {
        from: new Date(ano, 0, 1).toISOString(),
        to: new Date(ano, 11, 31, 23, 59, 59, 999).toISOString(),
      }
    }
    return {
      from: inicioGrade.toISOString(),
      to: new Date(somarDias(inicioGrade, totalCelulas).getTime() - 1).toISOString(),
    }
  }, [modo, mes, inicioGrade, totalCelulas])

  const { eventos, loading, fromCache } = useEventos(range, refreshKey)
  const porDia = useMemo(() => agruparPorDia(eventos), [eventos])

  const celulas = useMemo(() => {
    const lista: Date[] = []
    for (let i = 0; i < totalCelulas; i++) lista.push(somarDias(inicioGrade, i))
    return lista
  }, [inicioGrade, totalCelulas])

  const eventosSelecionados = porDia.get(diaSelecionado) ?? []

  const eventosPorAno = useMemo(() => agruparPorMes(eventos), [eventos])
  const ano = mes.getFullYear()
  const porMesAno = eventosPorAno.get(ano) ?? new Map<number, Map<number, Evento[]>>()

  function totalEventosNoMes(mesIndice: number): number {
    const mesMap = porMesAno.get(mesIndice)
    if (!mesMap) return 0
    let total = 0
    for (const lista of mesMap.values()) total += lista.length
    return total
  }

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
    if (modo === 'mes') setDiaSelecionado(hojeChave)
    atualizarUrl(novo)
  }

  function irParaAno(delta: number) {
    const novo = new Date(mes.getFullYear() + delta, 0, 1)
    setMes(novo)
    atualizarUrl(novo)
  }

  function abrirMes(anoAlvo: number, mesAlvo: number) {
    const alvo = new Date(anoAlvo, mesAlvo, 1)
    setMes(alvo)
    const ehHoje =
      alvo.getFullYear() === hoje.getFullYear() && alvo.getMonth() === hoje.getMonth()
    setDiaSelecionado(ehHoje ? hojeChave : dataParaInputDate(alvo))
    setModo('mes')
    atualizarUrl(alvo)
  }

  const botaoMes =
    'w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors'

  return (
    <div>
      <OfflineBanner fromCache={fromCache} />

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold capitalize truncate" style={{ color: 'var(--text-primary)' }}>
              {modo === 'ano' ? `Anual ${ano}` : `${nomeDoMes(mes.getMonth())} ${ano}`}
            </h1>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div
              className="flex items-center gap-0.5 rounded-lg p-0.5"
              style={{ backgroundColor: 'var(--btn-secondary-bg)' }}
            >
              {(['mes', 'ano'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  aria-label={m === 'mes' ? 'Visão mensal' : 'Visão anual'}
                  className="h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: modo === m ? 'var(--btn-primary-bg)' : 'transparent',
                    color: modo === m ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                  }}
                >
                  {m === 'mes' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => (modo === 'ano' ? irParaAno(-1) : irParaMes(-1))}
              className={botaoMes}
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
              aria-label={modo === 'ano' ? 'Ano anterior' : 'Mês anterior'}
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
              onClick={() => (modo === 'ano' ? irParaAno(1) : irParaMes(1))}
              className={botaoMes}
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
            aria-label={modo === 'ano' ? 'Próximo ano' : 'Próximo mês'}
          >
            ›
          </button>
        </div>
      </div>
      {modo === 'ano' && loading && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Carregando eventos do ano...
        </p>
      )}
    </div>

    {modo === 'ano' && (
      <div
        className="rounded-2xl p-3 md:p-4 mb-6"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
          {Array.from({ length: 12 }, (_, i) => {
            const ehMesAtual = ano === hoje.getFullYear() && i === hoje.getMonth()
            const diaHoje = ehMesAtual ? hoje.getDate() : null
            const diasDoMes = porMesAno.get(i)
            const total = totalEventosNoMes(i)
            return (
              <button
                key={i}
                type="button"
                onClick={() => abrirMes(ano, i)}
                className="rounded-xl p-3 flex flex-col gap-2 transition-colors text-left"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid',
                  borderColor: ehMesAtual ? 'var(--btn-primary-bg)' : 'var(--card-border)',
                }}
                aria-label={`Abrir ${nomeDoMes(i)} de ${ano}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {nomeDoMes(i)}
                  </span>
                  {total > 0 && (
                    <span
                      className="text-[11px] rounded-full px-2 py-0.5 flex-shrink-0"
                      style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}
                    >
                      {total}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-[3px]">
                  {Array.from({ length: diasNoMes(new Date(ano, i, 1)) }, (_, d) => {
                    const numDia = d + 1
                    const doDia = diasDoMes?.get(numDia) ?? []
                    const ehHojeDia = numDia === diaHoje
                    let cor = 'var(--card-border)'
                    if (doDia.length > 0) {
                      cor = doDia.some((e) => !e.done) ? 'var(--text-secondary)' : 'var(--text-tertiary)'
                    }
                    if (ehHojeDia) cor = 'var(--btn-primary-bg)'
                    return (
                      <span
                        key={numDia}
                        title={`${numDia} — ${doDia.length} evento(s)`}
                        className="rounded-full"
                        style={{ width: 6, height: 6, backgroundColor: cor }}
                      />
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )}

    {modo === 'mes' && (
      <>
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
      </>)}
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
