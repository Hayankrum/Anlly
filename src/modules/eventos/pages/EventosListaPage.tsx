'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useEventos } from '../useEventos'
import { alternarConclusaoEvento } from '../eventos.actions'
import type { Evento } from '../types'
import { inicioDoDiaLocal, somarDias } from '../dateUtils'
import OfflineBanner from '@/components/OfflineBanner'
import ItemEvento from '../components/ItemEvento'

function SecaoLista({
  titulo,
  cor,
  eventos,
  onToggle,
}: {
  titulo: string
  cor: string
  eventos: Evento[]
  onToggle: (evento: Evento) => void
}) {
  if (eventos.length === 0) return null
  return (
    <section className="mb-6">
      <h2
        className="text-sm font-semibold mb-2 flex items-center gap-2"
        style={{ color: cor }}
      >
        {titulo}
        <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
          {eventos.length}
        </span>
      </h2>
      <div className="flex flex-col gap-2">
        {eventos.map((evento) => (
          <ItemEvento key={evento.id} evento={evento} onToggle={onToggle} />
        ))}
      </div>
    </section>
  )
}

export default function EventosListaPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [acaoError, setAcaoError] = useState('')

  const range = (() => {
    const hoje = inicioDoDiaLocal(new Date())
    return {
      from: somarDias(hoje, -90).toISOString(),
      to: somarDias(hoje, 60).toISOString(),
    }
  })()

  const { eventos, loading, fromCache } = useEventos(range, refreshKey)

  const ordenar = (a: Evento, b: Evento) => a.startsAt.localeCompare(b.startsAt)
  const pendentes = eventos.filter((e) => !e.done).sort(ordenar)
  const concluidos = eventos.filter((e) => e.done).sort(ordenar)

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

  return (
    <div>
      <OfflineBanner fromCache={fromCache} />

      <Link
        href="/"
        className="text-sm transition-colors mb-4 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Início
      </Link>

      <header
        className="rounded-2xl p-5 mb-6"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          backgroundImage: 'linear-gradient(135deg, var(--bg-tertiary), transparent)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Todos os eventos
            </h1>
            {!loading && eventos.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {pendentes.length} pendentes · {concluidos.length} concluídos
              </p>
            )}
          </div>
          <Link
            href="/eventos/novo"
            className="font-medium rounded-lg px-4 py-2 text-sm transition-colors flex-shrink-0"
            style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
          >
            + Novo evento
          </Link>
        </div>
        {!loading && eventos.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-lg font-semibold leading-none" style={{ color: '#3b82f6' }}>{pendentes.length}</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Pendentes</p>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-lg font-semibold leading-none" style={{ color: '#10b981' }}>{concluidos.length}</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Concluídos</p>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-lg font-semibold leading-none" style={{ color: '#f59e0b' }}>
                {pendentes.filter((e) => new Date(e.startsAt) >= inicioDoDiaLocal(new Date())).length}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>A partir de hoje</p>
            </div>
          </div>
        )}
      </header>

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
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Nenhum evento por aqui ainda.
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
        <div>
          <SecaoLista titulo="Pendentes" cor="#3b82f6" eventos={pendentes} onToggle={toggleDone} />
          <SecaoLista titulo="Concluídos" cor="#10b981" eventos={concluidos} onToggle={toggleDone} />
        </div>
      )}
    </div>
  )
}