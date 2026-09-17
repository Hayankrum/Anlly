'use client'

import { useState } from 'react'
import { criarComentario } from '../comentarios.actions'


export default function FormComentario({ postId, onSuccess }: { postId: number; onSuccess?: () => void }) {
  const [texto, setTexto] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) return

    setIsSubmitting(true)
    setError('')

    const result = await criarComentario(postId, texto)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    setTexto('')
    setIsSubmitting(false)
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Escreva um comentário..."
        className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors resize-y min-h-[80px]"
        style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
      />
      {error && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !texto.trim()}
        className="mt-2 text-sm rounded-lg px-4 py-1.5 transition-colors disabled:opacity-50"
        style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
      >
        {isSubmitting ? 'Enviando...' : 'Comentar'}
      </button>
    </form>
  )
}
