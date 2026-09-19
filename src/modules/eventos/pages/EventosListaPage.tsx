'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useEventos } from '../useEventos'
import { alternarConclusaoEvento } from '../eventos.actions'
import type { Evento } from '../types'
import { inicioDoDiaLocal, somarDias } from '../dateUtils'
import OfflineBanner from '@/components/OfflineBanner'
import ItemEvento from '../components/ItemEvento'

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

  const pendentes = eventos.filter((e) => !e.done)
  const concluidos = eventos.filter((e) => e.done)

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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Todos os eventos
        </h1>
        <Link
          href="/eventos/novo"
          className="font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          + Novo evento
        </Link>
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
        <div className="flex flex-col gap-3">
          {pendentes.map((evento) => (
            <ItemEvento key={evento.id} evento={evento} onToggle={toggleDone} />
          ))}
          {concluidos.map((evento) => (
            <ItemEvento key={evento.id} evento={evento} onToggle={toggleDone} />
          ))}
        </div>
      )}
    </div>
  )
}
