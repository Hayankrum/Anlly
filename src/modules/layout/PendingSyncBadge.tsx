'use client'

import { useSyncExternalStore } from 'react'
import { subscribePendingCount, getPendingCountSnapshot } from '@/lib/pendingStore'
import Link from 'next/link'

export default function PendingSyncBadge({ mobile = false }: { mobile?: boolean }) {
  const count = useSyncExternalStore(subscribePendingCount, getPendingCountSnapshot, () => 0)

  if (count === 0) return null

  if (mobile) {
    return (
      <Link
        href="/posts"
        title={`${count} item(ns) aguardando sincronização`}
        className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold"
        style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: '1px solid var(--bg-tertiary)' }}
      >
        {count > 9 ? '9+' : count}
      </Link>
    )
  }

  return (
    <Link
      href="/posts"
      title={`${count} item(ns) aguardando sincronização`}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
      </svg>
      {count} pendente{count > 1 ? 's' : ''}
    </Link>
  )
}