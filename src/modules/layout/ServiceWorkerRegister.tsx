'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('SW registered:', reg.scope)
        console.log('SW state:', reg.active?.state)
        console.log('PushManager:', 'pushManager' in reg ? 'available' : 'NOT available')

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('SW state change:', newWorker.state)
            })
          }
        })
      }).catch((err) => {
        console.error('SW registration failed:', err)
      })
    } else {
      console.warn('Service Workers not supported')
    }
  }, [])

  return null
}
