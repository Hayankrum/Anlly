'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { criarPost, editarPost } from '../posts.actions'
import MapaSelecaoClient from '@/modules/mapa/components/MapaSelecaoClient'


interface Post {
  id: number
  titulo: string
  conteudo: string
  latitude?: number | null
  longitude?: number | null
}

interface Props {
  post?: Post
  error?: string
}

export default function PostFormPage({ post, error }: Props) {
  const isEditing = !!post
  const router = useRouter()
  const [titulo, setTitulo] = useState(post?.titulo ?? '')
  const [conteudo, setConteudo] = useState(post?.conteudo ?? '')
  const [latitude, setLatitude] = useState<number | null>(post?.latitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(post?.longitude ?? null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(error ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    try {
      if (isEditing) {
        const result = await editarPost(post.id, titulo, conteudo, latitude, longitude)
        if (result?.error) {
          setFormError(result.error)
          setSaving(false)
        }
      } else {
        const result = await criarPost(titulo, conteudo, latitude, longitude)
        if (result?.error) {
          setFormError(result.error)
          setSaving(false)
        } else {
          router.push('/posts')
        }
      }
    } catch {
      setSaving(false)
    }
  }

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }, [])

  function clearLocation() {
    setLatitude(null)
    setLongitude(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        {isEditing ? 'Editar post' : 'Novo post'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && (
          <p className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2" style={{ color: '#f87171' }}>
            {formError}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Título</label>
          <input
            name="titulo"
            placeholder="Digite o título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Conteúdo</label>
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            rows={6}
            placeholder="Escreva o conteúdo..."
            className="rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors resize-y"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Localização (opcional)</label>
            {latitude && longitude && (
              <button
                type="button"
                onClick={clearLocation}
                className="text-xs transition-colors hover:underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Remover localização
              </button>
            )}
          </div>
          <MapaSelecaoClient
            initialLat={latitude}
            initialLng={longitude}
            onLocationSelect={handleLocationSelect}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="font-medium rounded-lg px-4 py-2 transition-colors w-fit disabled:opacity-50"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar post'}
        </button>
      </form>
    </div>
  )
}
