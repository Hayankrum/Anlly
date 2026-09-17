'use client'

import { useOnlineStatus } from '@/lib/useOnlineStatus'

export default function OfflineBanner({ fromCache }: { fromCache?: boolean }) {
  const isOnline = useOnlineStatus()

  if (isOnline && !fromCache) return null

  return (
    <div
      className="mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
      style={{
        backgroundColor: isOnline ? 'var(--bg-tertiary)' : '#7c2d12',
        color: isOnline ? 'var(--text-secondary)' : '#fed7aa',
        border: '1px solid',
        borderColor: isOnline ? 'var(--border-color)' : '#9a3412',
      }}
    >
      <span>{isOnline ? '📦' : '📡'}</span>
      {isOnline
        ? 'Dados do cache. Sincronizando...'
        : 'Você está offline. Dados podem estar desatualizados.'}
    </div>
  )
}
