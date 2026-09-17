'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function SinoNotificacoes({ showLink = true, activeColor }: { showLink?: boolean; activeColor?: string }) {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (document.hidden) return
    try {
      const response = await fetch('/api/notifications/unread')
      const data = await response.json()
      setCount(data.count || 0)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(fetchCount, 100)

    const onNotificationUpdate = () => fetchCount()
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'notifications:updated') fetchCount()
    }
    const onVisibilityChange = () => {
      if (!document.hidden) fetchCount()
    }

    window.addEventListener('notifications:updated', onNotificationUpdate)
    window.addEventListener('storage', onStorageChange)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('notifications:updated', onNotificationUpdate)
      window.removeEventListener('storage', onStorageChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [fetchCount])

  const icon = (
    <span className="relative" style={activeColor ? { color: activeColor } : undefined}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  )

  if (!showLink) return icon

  return (
    <Link
      href="/notificacoes"
      className="relative transition-colors"
      style={{ color: 'var(--text-secondary)' }}
    >
      {icon}
    </Link>
  )
}