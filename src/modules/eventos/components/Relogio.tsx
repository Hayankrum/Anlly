'use client'

import { useSyncExternalStore } from 'react'
import { formatarDataLonga, formatarHora } from '../dateUtils'

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000)
  return () => clearInterval(id)
}

function getSnapshot(): number | null {
  return Math.floor(Date.now() / 1000)
}

function getServerSnapshot(): number | null {
  return null
}

export default function Relogio() {
  const segundos = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span
        className="text-3xl font-semibold tabular-nums"
        style={{ color: 'var(--text-primary)' }}
      >
        {segundos == null ? '--:--' : formatarHora(new Date())}
      </span>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {segundos == null ? '' : formatarDataLonga(new Date())}
      </span>
    </div>
  )
}
