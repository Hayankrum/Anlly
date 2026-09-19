'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { criarEvento, editarEvento, type DadosEvento } from '../eventos.actions'
import { LEMBRETES_RAPIDOS } from '../types'
import {
  dataParaInputDate,
  dataParaInputTime,
  diasDoEvento,
  formatarDataLonga,
} from '../dateUtils'
import CalendarioDias from '../components/CalendarioDias'
import MapaSelecaoClient from '@/modules/mapa/components/MapaSelecaoClient'

const CORES: string[] = [
  '#3b82f6',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#64748b',
]

interface EventoInicial {
  id: number
  title: string
  description: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean
  dias: string[] | null
  locationText: string | null
  latitude: number | null
  longitude: number | null
  color: string
  reminders: { offsetMinutes: number }[]
}

interface Props {
  evento?: EventoInicial
  error?: string
  dataInicial?: string | null
}

export default function EventoFormPage({ evento, error, dataInicial }: Props) {
  const isEditing = !!evento
  const router = useRouter()

  const [title, setTitle] = useState(evento?.title ?? '')
  const [description, setDescription] = useState(evento?.description ?? '')
  const [allDay, setAllDay] = useState(evento?.allDay ?? false)
  const [dias, setDias] = useState<string[]>(() => {
    if (evento) {
      const inicio = new Date(evento.startsAt)
      const fim = evento.endsAt ? new Date(evento.endsAt) : null
      return diasDoEvento(inicio, fim, evento.dias ?? null)
        .map(dataParaInputDate)
        .sort()
    }
    return [dataInicial || dataParaInputDate(new Date())]
  })
  const [horaInicio, setHoraInicio] = useState(() =>
    evento ? dataParaInputTime(new Date(evento.startsAt)) : ''
  )
  const [horaFim, setHoraFim] = useState(() =>
    evento?.endsAt && !evento.allDay ? dataParaInputTime(new Date(evento.endsAt)) : ''
  )
  const [color, setColor] = useState(evento?.color ?? CORES[0])
  const [mapaAberto, setMapaAberto] = useState(false)
  const [locationText, setLocationText] = useState(evento?.locationText ?? '')
  const [latitude, setLatitude] = useState<number | null>(evento?.latitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(evento?.longitude ?? null)
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(
    evento?.reminders.map((r) => r.offsetMinutes) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(error ?? '')

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }, [])

  function clearLocation() {
    setLatitude(null)
    setLongitude(null)
  }

  function toggleDia(chave: string) {
    setDias((prev) => (prev.includes(chave) ? prev.filter((x) => x !== chave) : [...prev, chave]))
  }

  const selecaoResumo = useMemo(() => {
    const ordenadas = dias.slice().sort()
    if (ordenadas.length === 0) return ''
    if (ordenadas.length === 1) return formatarDataLonga(new Date(`${ordenadas[0]}T12:00`))
    return `${ordenadas.length} dias marcados`
  }, [dias])

  function toggleReminder(offset: number) {
    setReminderOffsets((prev) =>
      prev.includes(offset) ? prev.filter((o) => o !== offset) : [...prev, offset]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    if (dias.length === 0) {
      setFormError('Marque pelo menos um dia')
      setSaving(false)
      return
    }

    const diasOrdem = dias.slice().sort()
    const inicioChave = diasOrdem[0]
    const fimChave = diasOrdem[diasOrdem.length - 1]

    const startsAtLocal = allDay ? `${inicioChave}T00:00` : `${inicioChave}T${horaInicio || '00:00'}`

    let endsAtLocal: string | null = null
    if (allDay) {
      if (diasOrdem.length > 1) endsAtLocal = `${fimChave}T23:59`
    } else if (horaFim) {
      endsAtLocal = `${fimChave}T${horaFim}`
    }

    const dados: DadosEvento = {
      title,
      description: description || null,
      startsAt: startsAtLocal,
      endsAt: endsAtLocal,
      allDay,
      dias: diasOrdem,
      locationText: locationText || null,
      latitude,
      longitude,
      color,
      reminderOffsets,
    }

    try {
      if (isEditing) {
        const result = await editarEvento(evento.id, dados)
        if (result?.error) {
          setFormError(result.error)
          setSaving(false)
        }
      } else {
        const result = await criarEvento(dados)
        if (result?.error) {
          setFormError(result.error)
          setSaving(false)
        } else {
          router.push(`/eventos/${result.id}`)
        }
      }
    } catch {
      setFormError('Sem conexão. Não foi possível salvar o evento.')
      setSaving(false)
    }
  }

  const inputClass =
    'rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors w-full'
  const labelClass = 'text-sm'

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        {isEditing ? 'Editar nota' : 'Nova nota'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && (
          <p className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2" style={{ color: '#f87171' }}>
            {formError}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da nota"
            required
            className={inputClass}
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descrição (opcional)"
            className="rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors resize-y"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dia inteiro</span>
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Dias *</label>
            {dias.length > 0 && (
              <span className="text-xs font-medium" style={{ color }}>
                {selecaoResumo}
              </span>
            )}
          </div>
          <div
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
          >
            <CalendarioDias dias={dias} color={color} onChange={toggleDia} />
          </div>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Hora de início</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={inputClass}
                style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Hora do fim</label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                placeholder="Opcional"
                className={inputClass}
                style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Cor</label>
          <div className="flex">
            {CORES.map((c) => {
              const ativa = color === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md flex items-center justify-center transition-transform"
                  style={{
                    backgroundColor: c,
                    border: '1px solid rgba(0,0,0,0.18)',
                    transform: ativa ? 'scale(1.06)' : 'scale(1)',
                    zIndex: ativa ? 1 : undefined,
                  }}
                  aria-label={`Cor ${c}`}
                  title={c}
                  aria-pressed={ativa}
                >
                  {ativa && (
                    <span
                      className="text-[10px] leading-none"
                      style={{ color: '#fff', textShadow: '0 0 2px rgba(0,0,0,0.6)' }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
            <label
              className="w-7 h-7 -ml-px last:rounded-r-md overflow-hidden relative cursor-pointer"
              style={{
                background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                border: '1px solid rgba(0,0,0,0.18)',
              }}
              title="Cor personalizada"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Escolher cor personalizada"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Local (texto)</label>
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Ex.: Praça Central"
            className={inputClass}
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setMapaAberto((v) => !v)}
            className="flex items-center justify-between rounded-lg px-4 py-2 text-sm transition-colors w-full"
            style={{
              backgroundColor: 'var(--btn-secondary-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--input-border)',
            }}
          >
            <span>🗺️ Ponto no mapa {latitude != null && longitude != null ? '(selecionado)' : '(opcional)'}</span>
            <span>{mapaAberto ? '▲' : '▼'}</span>
          </button>
          {latitude != null && longitude != null && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Localização: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          )}
          {mapaAberto && (
            <div className="flex flex-col gap-2">
              <MapaSelecaoClient
                initialLat={latitude}
                initialLng={longitude}
                onLocationSelect={handleLocationSelect}
              />
              {latitude != null && longitude != null && (
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-xs transition-colors hover:underline w-fit"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Remover ponto
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Lembretes</label>
          <div className="flex flex-wrap gap-2">
            {LEMBRETES_RAPIDOS.map((r) => {
              const ativo = reminderOffsets.includes(r.offset)
              return (
                <button
                  key={r.offset}
                  type="button"
                  onClick={() => toggleReminder(r.offset)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: ativo ? 'var(--btn-primary-bg)' : 'var(--btn-secondary-bg)',
                    color: ativo ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--input-border)',
                  }}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Você pode escolher mais de um lembrete.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="font-medium rounded-lg px-4 py-2 transition-colors w-fit disabled:opacity-50"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar nota'}
        </button>
      </form>
    </div>
  )
}