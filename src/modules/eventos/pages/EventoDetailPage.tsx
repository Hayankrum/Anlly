'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEvento } from '../useEventos'
import { alternarConclusaoEvento, deletarEvento } from '../eventos.actions'
import { formatarOffset } from '../types'
import {
  diasDoEvento,
  formatarDataCurta,
  formatarDataHoraCurta,
  formatarDataLonga,
  formatarHora,
} from '../dateUtils'
import MapaPosteClient from '@/modules/mapa/components/MapaPosteClient'
import OfflineBanner from '@/components/OfflineBanner'
import { useFormatoHora } from '@/lib/HorarioProvider'

export default function EventoDetailPage({ id }: { id: number }) {
  const router = useRouter()
  const { formato } = useFormatoHora()
  const [refreshKey, setRefreshKey] = useState(0)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [mapaAberto, setMapaAberto] = useState(false)
  const [acaoError, setAcaoError] = useState('')
  const { evento, loading, fromCache } = useEvento(id, refreshKey)

  if (loading) {
    return (
      <div>
        <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="h-6 w-2/3 rounded bg-zinc-600/20 mb-3" />
          <div className="h-4 w-1/3 rounded bg-zinc-600/20" />
        </div>
      </div>
    )
  }

  if (!evento) {
    return (
      <div>
        <OfflineBanner fromCache={fromCache} />
        <p style={{ color: 'var(--text-tertiary)' }}>Nota não encontrada.</p>
        <Link href="/" className="text-sm mt-4 inline-block hover:underline" style={{ color: 'var(--text-tertiary)' }}>
          ← Início
        </Link>
      </div>
    )
  }

  const e = evento

  const starts = new Date(e.startsAt)
  const ends = e.endsAt ? new Date(e.endsAt) : null

  function dataHoraTexto() {
    const diasMarcados = diasDoEvento(starts, e.allDay ? ends : null, e.dias ?? null)
    if (diasMarcados.length > 1) {
      const labelDias =
        diasMarcados.length > 5
          ? `${diasMarcados.length} dias marcados`
          : diasMarcados
              .slice()
              .sort((a, b) => a.getTime() - b.getTime())
              .map(formatarDataCurta)
              .join('  ·  ')
      if (e.allDay) return labelDias
      return `${formatarHora(starts, formato)} às ${formatarHora(ends ?? starts, formato)} · ${labelDias}`
    }
    if (e.allDay) return formatarDataLonga(starts)
    if (ends) {
      return `${formatarDataCurta(starts)} às ${formatarHora(starts, formato)} às ${formatarHora(ends, formato)}`
    }
    return `${formatarDataCurta(starts)} às ${formatarHora(starts, formato)}`
  }

  async function handleToggleDone() {
    setAcaoError('')
    try {
      const result = await alternarConclusaoEvento(e.id, !e.done)
      if (result?.error) {
        setAcaoError(result.error)
        return
      }
      setRefreshKey((k) => k + 1)
    } catch {
      setAcaoError('Sem conexão. Tente novamente quando estiver online.')
    }
  }

  async function handleDeletar() {
    setAcaoError('')
    try {
      const result = await deletarEvento(e.id)
      if (result?.error) {
        setAcaoError(result.error)
        return
      }
      router.push('/')
    } catch {
      setAcaoError('Sem conexão. Tente novamente quando estiver online.')
    }
  }

  const temLocal = !!e.latitude && !!e.longitude

  return (
    <div>
      <OfflineBanner fromCache={fromCache} />

      <div
        className="rounded-xl mb-5"
        style={{
          height: 20,
          background: `linear-gradient(90deg, ${e.color ?? '#3b82f6'} 0%, ${e.color ?? '#3b82f6'}88 100%)`,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
        }}
        aria-hidden="true"
      />

      <Link
        href="/"
        className="text-sm transition-colors mb-6 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Início
      </Link>

      <h1 className="text-2xl font-semibold mb-2 break-words" style={{ color: 'var(--text-primary)' }}>
        {e.title}
      </h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color ?? '#3b82f6' }} aria-label={`Cor do evento ${e.color ?? '#3b82f6'}`} title={e.color ?? '#3b82f6'} />
        {e.done && (
          <span
            className="text-xs font-medium rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
          >
            Concluído
          </span>
        )}
        {e.allDay && (
          <span className="text-xs font-medium rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}>
            Dia inteiro
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div>
          <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            {e.allDay ? 'Data' : 'Data e hora'}
          </p>
          <p style={{ color: 'var(--text-primary)' }}>{dataHoraTexto()}</p>
        </div>

        {e.locationText && (
          <div>
            <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Local</p>
            <p style={{ color: 'var(--text-primary)' }}>📍 {e.locationText}</p>
          </div>
        )}

        {e.description && (
          <div>
            <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Descrição</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{e.description}</p>
          </div>
        )}
      </div>

      {temLocal && (
        <div className="mb-8">
          <button
            onClick={() => setMapaAberto((v) => !v)}
            className="text-sm font-medium rounded-lg px-4 py-2 transition-colors flex items-center justify-between gap-2 w-full"
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
          >
            <span>🗺️ Ver localização no mapa</span>
            <span>{mapaAberto ? '▲' : '▼'}</span>
          </button>
          {mapaAberto && (
            <div className="mt-2">
              <MapaPosteClient
                latitude={e.latitude!}
                longitude={e.longitude!}
                titulo={e.title}
              />
            </div>
          )}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Lembretes</h2>
        {e.reminders.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhum lembrete definido.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {e.reminders.map((r) => {
              const notifyAt = new Date(r.notifyAt)
              const enviado = !!r.sentAt
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-4 py-2 text-sm"
                  style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>{formatarOffset(r.offsetMinutes)}</span>
                  <span className="text-xs" style={{ color: enviado ? '#16a34a' : 'var(--text-tertiary)' }}>
                    {enviado ? 'Enviado' : `em ${formatarDataHoraCurta(notifyAt, formato)}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {acaoError && (
        <p className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2 mb-4" style={{ color: '#f87171' }}>
          {acaoError}
        </p>
      )}

      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <button
          onClick={handleToggleDone}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: e.done ? 'var(--btn-secondary-bg)' : 'var(--btn-primary-bg)',
            color: e.done ? 'var(--text-primary)' : 'var(--btn-primary-text)',
          }}
        >
          {e.done ? 'Reabrir nota' : 'Concluir nota'}
        </button>
        <Link
          href={`/eventos/${e.id}/editar`}
          className="rounded-lg px-4 py-2 text-sm transition-colors"
          style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
        >
          Editar
        </Link>
        <button
          onClick={() => setConfirmandoExclusao(true)}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Excluir
        </button>
      </div>

      {confirmandoExclusao && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Excluir nota</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Tem certeza que quer excluir esta nota? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmandoExclusao(false)}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletar}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}