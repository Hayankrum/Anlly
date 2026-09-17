import { getAuthProvider } from '@/infrastructure/auth'
import type { AuthUser } from '@/infrastructure/auth'

const SESSION_COOKIE = 'sessionToken'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

export async function criarSessao(usuarioId: number): Promise<string> {
  const authProvider = getAuthProvider()
  return authProvider.createSession(usuarioId)
}

export async function obterSessao(): Promise<AuthUser | null> {
  const authProvider = getAuthProvider()
  const session = await authProvider.getSession()
  return session?.user ?? null
}

export async function destruirSessao(): Promise<void> {
  const authProvider = getAuthProvider()
  await authProvider.destroySession()
}

// Re-export for backward compatibility
export { SESSION_COOKIE, SESSION_MAX_AGE }
