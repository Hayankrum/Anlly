import type { AuthProvider } from './AuthProvider'
import { NextAuthProvider } from './providers/NextAuthProvider'
import { CredentialsAuthProvider } from './providers/CredentialsAuthProvider'

export type { AuthUser, AuthSession, LoginCredentials, RegisterData } from './AuthProvider'
export { NextAuthProvider } from './providers/NextAuthProvider'
export { CredentialsAuthProvider } from './providers/CredentialsAuthProvider'

let authProviderInstance: AuthProvider | null = null

export function getAuthProvider(): AuthProvider {
  if (!authProviderInstance) {
    const provider = process.env.AUTH_PROVIDER || 'nextauth'

    switch (provider) {
      case 'credentials':
        authProviderInstance = new CredentialsAuthProvider()
        break
      case 'nextauth':
      default:
        authProviderInstance = new NextAuthProvider()
        break
    }
  }
  return authProviderInstance
}
