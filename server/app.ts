import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { serveStatic } from '@hono/node-server/serve-static'
import { auth } from './auth'
import { env } from './env'
import { syncRoutes } from './sync'
import { termosRoutes } from './termos'
import { sessoesRoutes } from './sessoes'

const LIMITE_CORPO_API = 2 * 1024 * 1024 // 2 MB (push aceita até 500 mutações)

function direcoesCsp(): string[] {
  const direcoes = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // script-src sem 'unsafe-inline': o tema anti-flash é theme-init.js externo
    "script-src 'self'",
    // 'unsafe-inline' em styles: atributos style inline (ex.: barra de uso)
    "style-src 'self' 'unsafe-inline'",
    // data: para o QR gerado localmente em ShareSection
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
  ]
  if (new URL(env.APP_URL).protocol === 'https:') {
    direcoes.push('upgrade-insecure-requests')
  }
  return direcoes
}

function cabecalhosSeguranca(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Security-Policy': direcoesCsp().join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  }
  if (new URL(env.APP_URL).protocol === 'https:') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }
  return headers
}

const CABECALHOS_SEGURANCA = cabecalhosSeguranca()

export function createApp(): Hono {
  const app = new Hono()

  app.use('*', (c, next) => {
    for (const [nome, valor] of Object.entries(CABECALHOS_SEGURANCA)) {
      c.header(nome, valor)
    }
    return next()
  })

  app.use('/api/*', bodyLimit({ maxSize: LIMITE_CORPO_API }))

  app.get('/api/health', (c) => c.json({ ok: true, servico: 'anlly' }))

  app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

  app.route('/api', syncRoutes)
  app.route('/api', termosRoutes)
  app.route('/api', sessoesRoutes)

  // No Vercel quem serve dist/ é a CDN (vercel.json); a função só cuida de /api
  if (env.NODE_ENV === 'production' && !process.env.VERCEL) {
    // Assets com hash: cache longo. Documentos e bootstraps: sempre revalidar.
    app.use('/assets/*', (c, next) => {
      c.header('Cache-Control', 'public, max-age=31536000, immutable')
      return next()
    })
    for (const caminho of ['/sw.js', '/index.html', '/manifest.webmanifest', '/theme-init.js']) {
      app.use(caminho, (c, next) => {
        c.header('Cache-Control', 'no-cache')
        return next()
      })
    }
    app.use('/*', serveStatic({ root: './dist' }))
    // Fallback de rotas do cliente (hash router: qualquer path serve o index)
    app.get('/*', serveStatic({ path: './dist/index.html' }))
  }

  return app
}
