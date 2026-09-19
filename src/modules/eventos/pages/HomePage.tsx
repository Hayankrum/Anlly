'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useEventos } from '../useEventos'
import { alternarConclusaoEvento } from '../eventos.actions'
import type { Evento } from '../types'
import {
  dataParaInputDate,
  diasDeCalendarioAte,
  diasDoEvento,
  formatarDataCurta,
  formatarHora,
  inicioDoDiaLocal,
  somarDias,
} from '../dateUtils'
import { primeiroNome } from '@/lib/utils'
import OfflineBanner from '@/components/OfflineBanner'
import ItemEvento from '../components/ItemEvento'
import Relogio from '../components/Relogio'

const DIAS_ATRAS = 90
const DIAS_FRENTE = 60
const HORIZONTE_AGRUPADO = 14

interface GrupoDia {
  chave: string
  rotulo: string
  diasAte: number
  eventos: Evento[]
}

function ContadorCard({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <span className="text-3xl font-semibold leading-none" style={{ color: valor > 0 ? cor : 'var(--text-tertiary)' }}>
        {valor}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {rotulo}
      </span>
    </div>
  )
}

function textoProximoEvento(evento: Evento): string {
  const inicio = new Date(evento.startsAt)
  const diff = diasDeCalendarioAte(inicio, new Date())
  if (diff <= 0) return `hoje às ${formatarHora(inicio)}`
  if (diff === 1) return 'amanhã'
  return `em ${diff} dias`
}

function Secao({
  titulo,
  cor,
  eventos,
  onToggle,
  mostrarData,
}: {
  titulo: string
  cor?: string
  eventos: Evento[]
  onToggle: (evento: Evento) => void
  mostrarData: boolean
}) {
  if (eventos.length === 0) return null

  return (
    <section className="mb-6">
      <h2
        className="text-sm font-semibold mb-2 flex items-center gap-2"
        style={{ color: cor ?? 'var(--text-secondary)' }}
      >
        {titulo}
        <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
          {eventos.length}
        </span>
      </h2>
      <div className="flex flex-col gap-2">
        {eventos.map((evento) => (
          <ItemEvento
            key={evento.id}
            evento={evento}
            onToggle={onToggle}
            mostrarData={mostrarData}
          />
        ))}
      </div>
    </section>
  )
}

export default function HomePage({ usuarioNome }: { usuarioNome?: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [acaoError, setAcaoError] = useState('')

  const range = useMemo(() => {
    const hoje = inicioDoDiaLocal(new Date())
    return {
      from: somarDias(hoje, -DIAS_ATRAS).toISOString(),
      to: somarDias(hoje, DIAS_FRENTE).toISOString(),
    }
  }, [])

  const { eventos, loading, fromCache } = useEventos(range, refreshKey)

  const { atrasados, hoje, amanha, proximos, proximosTotal, proximoEvento } = useMemo(() => {
    const agora = new Date()
    const inicioHoje = inicioDoDiaLocal(agora)
    const atrasados: Evento[] = []
    const porDia = new Map<string, Evento[]>()

    for (const evento of eventos) {
      const inicio = new Date(evento.startsAt)
      const fim = evento.allDay && evento.endsAt ? new Date(evento.endsAt) : null
      const terminou = fim && fim.getTime() < inicioHoje.getTime()
      if (!evento.done && (!fim ? inicio.getTime() < inicioHoje.getTime() : terminou)) {
        atrasados.push(evento)
        continue
      }
      const dias = diasDoEvento(inicio, fim, evento.dias ?? null)
      for (const d of dias) {
        const chave = dataParaInputDate(d)
        const lista = porDia.get(chave)
        if (lista) lista.push(evento)
        else porDia.set(chave, [evento])
      }
    }

    const comparar = (a: Evento, b: Evento) =>
      Number(a.done) - Number(b.done) || a.startsAt.localeCompare(b.startsAt)

    atrasados.sort(comparar)

    const grupos: GrupoDia[] = []
    for (const [chave, lista] of porDia) {
      lista.sort(comparar)
      const primeiro = new Date(lista[0].startsAt)
      const dia = new Date(`${chave}T00:00`)
      grupos.push({
        chave,
        rotulo: formatarDataCurta(primeiro),
        diasAte: diasDeCalendarioAte(dia, agora),
        eventos: lista,
      })
    }
    grupos.sort((a, b) => a.chave.localeCompare(b.chave))

    const proximos = grupos.filter((g) => g.diasAte >= 2 && g.diasAte <= HORIZONTE_AGRUPADO)
    const proximosTotal = new Set(proximos.flatMap((g) => g.eventos).map((e) => e.id)).size

    const proximoEvento = eventos
      .filter((e) => !e.done && new Date(e.startsAt).getTime() >= agora.getTime())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null

    return {
      atrasados,
      hoje: grupos.find((g) => g.diasAte === 0)?.eventos ?? [],
      amanha: grupos.find((g) => g.diasAte === 1)?.eventos ?? [],
      proximos,
      proximosTotal,
      proximoEvento,
    }
  }, [eventos])

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

  const semProximos =
    !loading &&
    atrasados.length === 0 &&
    hoje.length === 0 &&
    amanha.length === 0 &&
    proximos.length === 0

  return (
    <div>
      <OfflineBanner fromCache={fromCache} />

      <header
        className="rounded-2xl p-5 mb-6"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              {usuarioNome ? `Olá, ${primeiroNome(usuarioNome)}` : 'Sua agenda'}
            </p>
            <Relogio />
          </div>
          <Link
            href="/eventos/novo"
            className="font-medium rounded-lg px-4 py-2 text-sm transition-colors flex-shrink-0"
            style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
          >
            + Novo
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 mb-6">
        {proximoEvento && (
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderLeft: `4px solid ${proximoEvento.color ?? '#3b82f6'}` }}
          >
            <div className="min-w-0">
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Próximo evento</p>
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{proximoEvento.title}</p>
            </div>
            <span className="text-lg font-semibold whitespace-nowrap" style={{ color: '#3b82f6' }}>
              {textoProximoEvento(proximoEvento)}
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ContadorCard rotulo="Hoje" valor={hoje.length} cor="#3b82f6" />
          <ContadorCard rotulo="Amanhã" valor={amanha.length} cor="#10b981" />
          <ContadorCard rotulo="Atrasados" valor={atrasados.length} cor="#ef4444" />
          <ContadorCard rotulo={`Próximos (${HORIZONTE_AGRUPADO}d)`} valor={proximosTotal} cor="#f59e0b" />
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

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
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
      ) : eventos.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div className="text-4xl mb-3">🗓️</div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Nenhum evento agendado ainda.
          </p>
          <Link
            href="/eventos/novo"
            className="font-medium rounded-lg px-4 py-2 text-sm transition-colors inline-block"
            style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
          >
            Criar primeiro evento
          </Link>
        </div>
      ) : (
        <>
          <Secao
            titulo="Atrasados"
            cor="#f87171"
            eventos={atrasados}
            onToggle={toggleDone}
            mostrarData
          />
          <Secao titulo="Hoje" eventos={hoje} onToggle={toggleDone} mostrarData={false} />
          <Secao titulo="Amanhã" eventos={amanha} onToggle={toggleDone} mostrarData={false} />

          {proximos.map((grupo) => (
            <Secao
              key={grupo.chave}
              titulo={`${grupo.rotulo} · daqui a ${grupo.diasAte} dias`}
              eventos={grupo.eventos}
              onToggle={toggleDone}
              mostrarData={false}
            />
          ))}

          {semProximos && (
            <div
              className="rounded-lg p-6 text-center mb-6"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Nada nos próximos {HORIZONTE_AGRUPADO} dias.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
