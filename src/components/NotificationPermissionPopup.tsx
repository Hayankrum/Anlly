'use client'

import { useState } from 'react'
import { usePushSubscription } from '@/lib/usePushSubscription'
import { toggleNotificacoes } from '@/modules/usuarios/usuarios.actions'

interface Props {
  usuarioId?: number
}

const STORAGE_KEY = 'notif_banner_dismissed'

function getInitialDismissed() {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export default function NotificationPermissionPopup({ usuarioId }: Props) {
  const { isSubscribed, isSubscribing, isSupported, isLoading, permissionDenied, subscribe } = usePushSubscription()
  const [dismissed, setDismissed] = useState(getInitialDismissed)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  if (!usuarioId || !isSupported || isLoading || isSubscribed || dismissed) return null

  const handleAtivar = async () => {
    setError(null)
    setSuccess(false)

    const result = await subscribe()
    if (result.success) {
      await toggleNotificacoes(true)
      setSuccess(true)
      setTimeout(() => handleDismiss(), 2000)
    } else {
      setError(result.error || 'Erro ao ativar notificações.')
    }
  }

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[290] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        color: 'var(--text-primary)',
        maxWidth: '90vw',
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-none cursor-pointer"
        style={{ background: 'var(--btn-secondary-bg)', color: 'var(--text-tertiary)' }}
      >
        ×
      </button>
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width: '2.2rem',
          height: '2.2rem',
          background: success ? '#dcfce7' : permissionDenied ? '#fee2e2' : '#fef3c7',
        }}
      >
        <span
          className="text-sm"
          style={{ color: success ? '#16a34a' : permissionDenied ? '#dc2626' : '#d97706' }}
        >
          {success ? '✓' : permissionDenied ? '🔒' : '🔔'}
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold">
          {success
            ? 'Notificações ativadas!'
            : permissionDenied
              ? 'Notificações bloqueadas'
              : 'Ative as notificações'}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {success
            ? 'Você receberá alertas quando alguém comentar'
            : permissionDenied
              ? 'Clique no ícone 🔒 na barra de endereço e ative'
              : 'Receba alertas quando alguém comentar nos seus posts'}
        </span>
        {error && (
          <span className="text-xs mt-1 text-red-500 whitespace-pre-line">{error}</span>
        )}
      </div>
      {!permissionDenied && !success && (
        <button
          onClick={handleAtivar}
          disabled={isSubscribing}
          className="ml-2 px-4 py-1.5 rounded-xl text-sm font-bold border-none cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          {isSubscribing ? 'Ativando...' : 'Ativar'}
        </button>
      )}
    </div>
  )
}
