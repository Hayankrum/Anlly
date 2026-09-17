'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const LOG_PREFIX = '[Push]'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBufferSource(uint8Array: Uint8Array): any {
  return uint8Array.buffer
}

function getBrowserInfo() {
  const ua = navigator.userAgent
  const isFirefox = ua.includes('Firefox')
  const isBrave = !!(navigator as unknown as { brave?: { isBrave?: () => boolean } }).brave?.isBrave?.()
  const isChrome = ua.includes('Chrome') && !isBrave
  const isEdge = ua.includes('Edg/')
  const isSafari = ua.includes('Safari') && !ua.includes('Chrome')
  return { isFirefox, isBrave, isChrome, isEdge, isSafari }
}

function getInitialState() {
  if (typeof window === 'undefined') {
    return { isSupported: false, isLoading: true, permissionDenied: false }
  }

  const hasSW = 'serviceWorker' in navigator
  const hasPush = 'PushManager' in window
  const hasNotification = 'Notification' in window
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost'

  const supported = hasSW && hasPush && hasNotification && isSecure
  const denied = hasNotification && Notification.permission === 'denied'

  console.log(`${LOG_PREFIX} Browser support:`, {
    hasSW,
    hasPush,
    hasNotification,
    isSecure,
    supported,
    denied,
    browser: getBrowserInfo(),
  })

  return { isSupported: supported, isLoading: supported, permissionDenied: denied }
}

async function waitForServiceWorkerReady(timeoutMs = 15000): Promise<ServiceWorkerRegistration> {
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Service Worker ready timeout')), timeoutMs)
    ),
  ])

  if (!registration.active) {
    console.log(`${LOG_PREFIX} SW not active yet, waiting...`)
    await new Promise<void>((resolve) => {
      const sw = registration.installing || registration.waiting
      if (sw) {
        const onStateChange = () => {
          if (sw.state === 'activated') {
            sw.removeEventListener('statechange', onStateChange)
            resolve()
          }
        }
        sw.addEventListener('statechange', onStateChange)
        setTimeout(() => {
          sw.removeEventListener('statechange', onStateChange)
          resolve()
        }, 5000)
      } else {
        resolve()
      }
    })
    return navigator.serviceWorker.ready
  }

  return registration
}

export function usePushSubscription() {
  const [state, setState] = useState(getInitialState)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!state.isSupported) return

    let cancelled = false

    const checkSubscription = async () => {
      try {
        console.log(`${LOG_PREFIX} Checking existing subscription...`)

        const registration = await waitForServiceWorkerReady(10000)
        if (cancelled) return

        const subscription = await registration.pushManager.getSubscription()
        if (cancelled) return

        if (subscription) {
          const endpoint = subscription.endpoint
          console.log(`${LOG_PREFIX} Found local subscription, endpoint:`, endpoint.substring(0, 50) + '...')

          try {
            const res = await fetch('/api/subscribe/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint }),
            })
            const data = await res.json()
            if (cancelled) return

            if (!data.registered) {
              console.log(`${LOG_PREFIX} Subscription not in server, cleaning up local`)
              await subscription.unsubscribe().catch(() => {})
              if (mountedRef.current && !cancelled) setIsSubscribed(false)
            } else {
              console.log(`${LOG_PREFIX} Subscription verified on server`)
              if (mountedRef.current && !cancelled) setIsSubscribed(true)
            }
          } catch (err) {
            console.warn(`${LOG_PREFIX} Failed to verify with server, assuming subscribed:`, err)
            if (mountedRef.current && !cancelled) setIsSubscribed(true)
          }
        } else {
          console.log(`${LOG_PREFIX} No local subscription found`)
          if (mountedRef.current && !cancelled) setIsSubscribed(false)
        }
      } catch (error) {
        console.warn(`${LOG_PREFIX} Error checking subscription:`, error)
        if (mountedRef.current && !cancelled) setIsSubscribed(false)
      } finally {
        if (mountedRef.current && !cancelled) {
          setState((prev) => ({ ...prev, isLoading: false }))
        }
      }
    }

    checkSubscription()

    return () => {
      cancelled = true
    }
  }, [state.isSupported])

  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isSubscribing) return { success: false, error: 'Aguarde...' }
    if (isSubscribed) return { success: false, error: 'Já inscrito' }

    setIsSubscribing(true)
    console.log(`${LOG_PREFIX} Starting subscribe flow...`)

    try {
      // 1. Get VAPID key
      let vapidKey: string | null = null
      try {
        const res = await fetch('/api/vapid-key')
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          return { success: false, error: errData.error || 'Erro ao buscar chave VAPID. Verifique as variáveis de ambiente.' }
        }
        const data = await res.json()
        vapidKey = data.publicKey || null
        console.log(`${LOG_PREFIX} VAPID key obtained`)
      } catch {
        return { success: false, error: 'Erro de conexão ao buscar chave VAPID.' }
      }

      if (!vapidKey) {
        return { success: false, error: 'Chave VAPID não configurada. Verifique VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_EMAIL.' }
      }

      // 2. Check notification permission
      if ('Notification' in window) {
        if (Notification.permission === 'denied') {
          setState((prev) => ({ ...prev, permissionDenied: true }))
          return { success: false, error: 'Permissão negada. Ative nas configurações do navegador (ícone 🔒 na barra de endereço).' }
        }

        if (Notification.permission === 'default') {
          console.log(`${LOG_PREFIX} Requesting notification permission...`)
          const permission = await Notification.requestPermission()
          console.log(`${LOG_PREFIX} Permission result:`, permission)

          if (permission !== 'granted') {
            if (permission === 'denied') {
              setState((prev) => ({ ...prev, permissionDenied: true }))
            }
            return { success: false, error: 'Você precisa permitir notificações para ativar.' }
          }
        } else {
          console.log(`${LOG_PREFIX} Permission already granted`)
        }
      }

      // 3. Wait for Service Worker
      console.log(`${LOG_PREFIX} Waiting for Service Worker...`)
      const registration = await waitForServiceWorkerReady(20000)
      console.log(`${LOG_PREFIX} Service Worker ready, state:`, registration.installing ? 'installing' : registration.waiting ? 'waiting' : 'active')

      if (!registration.pushManager) {
        return { success: false, error: 'Push Manager não disponível neste navegador.' }
      }

      // 4. Check existing subscription and clean up if needed
      let subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        console.log(`${LOG_PREFIX} Found existing subscription, cleaning up...`)
        try {
          await subscription.unsubscribe()
        } catch (err) {
          console.warn(`${LOG_PREFIX} Failed to unsubscribe existing:`, err)
        }
        subscription = null
      }

      // 5. Subscribe to push
      console.log(`${LOG_PREFIX} Subscribing to push...`)
      const appServerKey = urlBase64ToUint8Array(vapidKey)

      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBufferSource(appServerKey),
        })
      } catch (subErr: unknown) {
        const errMsg = subErr instanceof Error ? subErr.message : String(subErr)
        console.error(`${LOG_PREFIX} Push subscribe failed:`, errMsg)

        const browser = getBrowserInfo()

        // Brave-specific error handling
        if (browser.isBrave) {
          if (errMsg.includes('push service') || errMsg.includes('Push service')) {
            return {
              success: false,
              error: 'O Brave bloqueia notificações push por padrão.\n\nSolução:\n1. Acesse brave://settings/content/notifications\n2. Adicione este site à lista de permissões\n3. Ou use Chrome/Firefox para melhor compatibilidade',
            }
          }
          return {
            success: false,
            error: `Erro no Brave: ${errMsg}\n\nVerifique brave://settings/content/notifications`,
          }
        }

        // Firefox-specific error handling
        if (browser.isFirefox) {
          if (errMsg.includes('push service') || errMsg.includes('Push service')) {
            return {
              success: false,
              error: 'Serviço de push do Firefox indisponível.\n\nVerifique:\n1. about:config → dom.push.enabled = true\n2. about:config → dom.push.connection.enabled = true\n3. Reinicie o Firefox após alterar as configurações',
            }
          }
          return {
            success: false,
            error: `Erro no Firefox: ${errMsg}`,
          }
        }

        // Generic error
        if (errMsg.includes('push service not available') || errMsg.includes('Push service')) {
          return {
            success: false,
            error: 'Serviço de push não disponível. Verifique se:\n1. O navegador suporta notificações push\n2. Você está acessando via HTTPS\n3. No Linux, instale libnotify ou use Chrome/Edge',
          }
        }

        return { success: false, error: `Erro ao ativar: ${errMsg}` }
      }

      if (!subscription) {
        return { success: false, error: 'Falha ao criar inscrição push.' }
      }

      console.log(`${LOG_PREFIX} Push subscription created, endpoint:`, subscription.endpoint.substring(0, 50) + '...')

      // 6. Send to server
      const subscriptionJson = subscription.toJSON()
      const endpoint = subscriptionJson.endpoint
      const keys = subscriptionJson.keys as { p256dh: string; auth: string }

      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, keys }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        await subscription.unsubscribe().catch(() => {})
        return { success: false, error: data.error || 'Erro ao salvar inscrição no servidor' }
      }

      console.log(`${LOG_PREFIX} Subscription saved on server successfully`)
      if (mountedRef.current) setIsSubscribed(true)
      return { success: true }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'desconhecido'
      console.error(`${LOG_PREFIX} Subscribe error:`, message)
      return { success: false, error: `Erro inesperado: ${message}` }
    } finally {
      if (mountedRef.current) setIsSubscribing(false)
    }
  }, [isSubscribing, isSubscribed])

  const unsubscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`${LOG_PREFIX} Starting unsubscribe flow...`)

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const subscriptionJson = subscription.toJSON()
        const endpoint = subscriptionJson.endpoint

        await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })

        await subscription.unsubscribe()
        console.log(`${LOG_PREFIX} Unsubscribed successfully`)
      }

      if (mountedRef.current) setIsSubscribed(false)
      return { success: true }
    } catch (error) {
      console.warn(`${LOG_PREFIX} Unsubscribe error:`, error)
      if (mountedRef.current) setIsSubscribed(false)
      return { success: true }
    }
  }, [])

  return {
    isSubscribed,
    isSubscribing,
    isSupported: state.isSupported,
    isLoading: state.isLoading,
    permissionDenied: state.permissionDenied,
    subscribe,
    unsubscribe,
  }
}
