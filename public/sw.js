const CACHE_STATIC = 'static-v6'
const CACHE_PAGES = 'pages-v6'
const CACHE_API = 'api-v6'

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.addAll([
        '/',
        '/offline',
        '/icons/icon.svg',
        '/manifest.json',
      ])
    ).then(() => {
      console.log('[SW] Installed, skipping waiting')
      return self.skipWaiting()
    })
  )
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_STATIC) && !k.startsWith(CACHE_PAGES) && !k.startsWith(CACHE_API))
          .map((k) => caches.delete(k))
      )
    ).then(() => {
      console.log('[SW] Activated, claiming clients')
      return self.clients.claim()
    })
  )
})

// Network first para API, com fallback cache
async function networkFirstWithCache(request) {
  if (request.url.startsWith('chrome-extension://')) return fetch(request)
  const cache = await caches.open(CACHE_API)
  try {
    const response = await fetch(request)
    if (response && response.status === 200 && request.url.startsWith('http')) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Cache first para assets estáticos (JS, CSS, icons, fonts)
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_STATIC)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}

function sessionKey(request) {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return 'anon'
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const pair = part.trim().split('=')
    const name = pair[0]
    if (name === 'sw_session_id') {
      const value = pair.slice(1).join('=')
      if (value) return value
    }
  }
  return 'anon'
}

// Stale-while-revalidate por sessão para navegação (HTML pages)
async function navigationHandler(request) {
  const cache = await caches.open(`${CACHE_PAGES}-${sessionKey(request)}`)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => {
      if (cached) return cached
      return caches.match('/offline')
    })

  return cached || fetchPromise
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Subscription-related API routes → network only (never cache)
  const NO_CACHE_API = ['/api/subscribe', '/api/unsubscribe', '/api/vapid-key']
  if (NO_CACHE_API.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(fetch(request))
    return
  }

  // Other API routes → network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request))
    return
  }

  // Static assets → cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navigation (HTML pages) → stale while revalidate
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request))
    return
  }

  // Outros → network first com cache
  event.respondWith(networkFirstWithCache(request))
})

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received')

  if (!event.data) {
    console.warn('[SW] Push event without data')
    return
  }

  let data
  try {
    data = event.data.json()
  } catch (err) {
    console.error('[SW] Failed to parse push data:', err)
    return
  }

  console.log('[SW] Push data:', data)

  const options = {
    body: data.body || data.mensagem,
    icon: data.icon || '/icons/icon.svg',
    badge: data.badge || '/icons/icon.svg',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notificação', options)
      .then(() => console.log('[SW] Notification shown'))
      .catch((err) => console.error('[SW] Failed to show notification:', err))
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked, action:', event.action)
  event.notification.close()

  if (event.action === 'dismiss') return

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open with the URL
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          console.log('[SW] Focusing existing window')
          return client.focus()
        }
      }

      // Open new window
      if (clients.openWindow) {
        console.log('[SW] Opening new window:', urlToOpen)
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Handle subscription changes (important for cross-browser compatibility)
// This fires when the push subscription is invalidated by the browser
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed')

  event.waitUntil(
    (async () => {
      try {
        // Get the new subscription
        const registration = await self.registration
        let subscription = await registration.pushManager.getSubscription()

        // If subscription was deleted, try to resubscribe
        if (!subscription) {
          console.log('[SW] Subscription lost, attempting to resubscribe...')

          // Get VAPID key from server
          const vapidRes = await fetch('/api/vapid-key')
          if (!vapidRes.ok) {
            console.error('[SW] Failed to get VAPID key for resubscription')
            return
          }
          const { publicKey } = await vapidRes.json()

          if (!publicKey) {
            console.error('[SW] No VAPID key received')
            return
          }

          // Convert VAPID key
          const padding = '='.repeat((4 - (publicKey.length % 4)) % 4)
          const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/')
          const rawData = atob(base64)
          const appServerKey = new Uint8Array(rawData.length)
          for (let i = 0; i < rawData.length; ++i) {
            appServerKey[i] = rawData.charCodeAt(i)
          }

          // Resubscribe
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey,
          })

          console.log('[SW] Resubscribed successfully')
        }

        // Send updated subscription to server
        if (subscription) {
          const subscriptionJson = subscription.toJSON()
          const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: subscriptionJson.endpoint,
              keys: subscriptionJson.keys,
            }),
          })

          if (res.ok) {
            console.log('[SW] Subscription updated on server')
          } else {
            console.error('[SW] Failed to update subscription on server')
          }
        }
      } catch (err) {
        console.error('[SW] Error handling pushsubscriptionchange:', err)
      }
    })()
  )
})

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncPending())
  }
})

async function syncPending() {
  const clients_list = await self.clients.matchAll()
  for (const client of clients_list) {
    client.postMessage({ type: 'SYNC_MUTATIONS' })
  }
}
