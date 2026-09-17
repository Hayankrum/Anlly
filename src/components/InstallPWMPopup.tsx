'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWMPopup() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    const handleInstalled = () => {
      setShow(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  if (!show || !deferredPrompt) return null

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border"
      style={{
        background: 'var(--btn-primary-bg)',
        borderColor: 'var(--btn-primary-bg)',
        color: 'var(--btn-primary-text)',
        maxWidth: '90vw',
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <div className="flex flex-col">
        <span className="text-sm font-bold">Instalar Meu App</span>
        <span className="text-xs opacity-80">Acesse rápido pela tela inicial</span>
      </div>
      <button
        onClick={handleInstall}
        className="ml-2 px-4 py-1.5 rounded-xl text-sm font-bold border-none cursor-pointer"
        style={{ background: '#fff', color: 'var(--btn-primary-bg)' }}
      >
        Instalar
      </button>
      <button
        onClick={() => setShow(false)}
        className="ml-1 text-lg cursor-pointer border-none bg-transparent"
        style={{ color: '#fff' }}
      >
        ×
      </button>
    </div>
  )
}
