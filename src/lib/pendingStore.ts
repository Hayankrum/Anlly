'use client'

import { getPendingMutations } from '@/lib/db'

let pendingCount = 0
const listeners = new Set<() => void>()
let refreshing = false

function emit() {
  for (const l of listeners) l()
}

export async function refreshPendingCount() {
  if (refreshing) return
  refreshing = true
  try {
    const mutacoes = await getPendingMutations()
    if (mutacoes.length !== pendingCount) {
      pendingCount = mutacoes.length
      emit()
    }
  } catch {
    // IndexedDB indisponível em SSR - ignora
  } finally {
    refreshing = false
  }
}

export function subscribePendingCount(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

export function getPendingCountSnapshot() {
  return pendingCount
}

if (typeof window !== 'undefined') {
  refreshPendingCount()

  window.addEventListener('online', refreshPendingCount)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshPendingCount()
  })

  window.addEventListener('focus', refreshPendingCount)
}