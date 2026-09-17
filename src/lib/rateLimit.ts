interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}

export interface RateLimitConfig {
  windowMs: number
  max: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60_000, max: 60 }
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.max - 1, resetAt }
  }

  entry.count++

  if (entry.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

export function getRateLimitKey(request: Request, prefix = 'api'): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  const url = new URL(request.url)
  return `${prefix}:${ip}:${url.pathname}`
}
