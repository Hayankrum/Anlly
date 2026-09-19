'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { criarEvento, editarEvento, type DadosEvento } from '../eventos.actions'
import { LEMBRETES_RAPIDOS } from '../types'
import { dataParaInputDate, dataParaInputTime } from '../dateUtils'
import MapaSelecaoClient from '@/modules/mapa/components/MapaSelecaoClient'

interface EventoInicial {
  id: number
  title: string
  description: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean
  locationText: string | null
  latitude: number | null
  longitude: number | null
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
  const [data, setData] = useState(() => {
    if (evento) return dataParaInputDate(new Date(evento.startsAt))
    return dataInicial || dataParaInputDate(new Date())
  })
  const [horaInicio, setHoraInicio] = useState(() =>
    evento ? dataParaInputTime(new Date(evento.startsAt)) : ''
  )
  const [horaFim, setHoraFim] = useState(() =>
    evento?.endsAt ? dataParaInputTime(new Date(evento.endsAt)) : ''
  )
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

  function toggleReminder(offset: number) {
    setReminderOffsets((prev) =>
      prev.includes(offset) ? prev.filter((o) => o !== offset) : [...prev, offset]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    if (!data) {
      setFormError('Data é obrigatória')
      setSaving(false)
      return
    }

    const startsAtLocal = allDay ? `${data}T00:00` : `${data}T${horaInicio || '00:00'}`
    const endsAtLocal = !allDay && horaFim ? `${data}T${horaFim}` : null

    const dados: DadosEvento = {
      title,
      description: description || null,
      startsAt: startsAtLocal,
      endsAt: endsAtLocal,
      allDay,
      locationText: locationText || null,
      latitude,
      longitude,
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
        {isEditing ? 'Editar evento' : 'Novo evento'}
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
            placeholder="Título do evento"
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

        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Data *</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            className={inputClass}
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
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
          <div className="flex items-center justify-between">
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Ponto no mapa (opcional)</label>
            {latitude != null && longitude != null && (
              <button
                type="button"
                onClick={clearLocation}
                className="text-xs transition-colors hover:underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Remover ponto
              </button>
            )}
          </div>
          <MapaSelecaoClient
            initialLat={latitude}
            initialLng={longitude}
            onLocationSelect={handleLocationSelect}
          />
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
          {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar evento'}
        </button>
      </form>
    </div>
  )
}