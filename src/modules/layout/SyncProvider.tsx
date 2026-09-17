'use client'

import { useEffect, useRef, useState } from 'react'
import { syncAll, getPendingMutations } from '@/lib/db'
import { refreshPendingCount } from '@/lib/pendingStore'

export default function SyncProvider() {
  const [sincronizado, setSincronizado] = useState(false)
  const syncingRef = useRef(false)

  useEffect(() => {
    async function doSync() {
      if (syncingRef.current || typeof navigator === 'undefined') return
      syncingRef.current = true
      try {
        const mutacoes = await getPendingMutations()
        const total = mutacoes.length
        await syncAll()
        await refreshPendingCount()
        if (total > 0) {
          setSincronizado(true)
          setTimeout(() => setSincronizado(false), 5000)
        }
      } finally {
        syncingRef.current = false
      }
    }

    const handleOnline = () => {
      setTimeout(doSync, 1500)
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_MUTATIONS') {
        doSync()
      }
    }

    window.addEventListener('online', handleOnline)
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage)

    // Sincroniza pendências ao abrir o app online
    if (navigator.onLine) {
      setTimeout(doSync, 2000)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)
    }
  }, [])

  return (
    <>
      {sincronizado && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm"
          role="status"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--text-primary)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
            <path d="M22 2L11 13"/>
            <path d="M22 2L15 22L11 13L2 9L22 2z"/>
          </svg>
          <span>Dados offline sincronizados!</span>
        </div>
      )}
    </>
  )
}