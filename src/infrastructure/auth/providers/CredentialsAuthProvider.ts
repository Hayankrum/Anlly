import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import type {
  AuthProvider,
  AuthSession,
  LoginCredentials,
  RegisterData,
} from '../AuthProvider'

const SESSION_COOKIE = 'sessionToken'
const SW_SESSION_COOKIE = 'sw_session_id'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const BCRYPT_SALT = 10

function getJWTSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET não definido. Configure a variável de ambiente AUTH_SECRET.')
  }
  return secret
}

/**
 * Example CredentialsAuthProvider - JWT-based authentication
 * without NextAuth dependency.
 *
 * This provider can be used as a reference for implementing
 * alternative auth providers (e.g., custom JWT, OAuth2, etc.)
 */
export class CredentialsAuthProvider implements AuthProvider {
  async isSecureConnection(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      return process.env.FORCE_HTTPS === 'true'
    }
    return false
  }

  async createSession(userId: number): Promise<string> {
    const token = jwt.sign({ userId }, getJWTSecret(), {
      expiresIn: SESSION_MAX_AGE,
    })

    const secure = await this.isSecureConnection()
    const cookieStore = await cookies()
    const cookieOptions: Record<string, unknown> = {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      path: '/',
    }

    if (secure) {
      cookieOptions.secure = true
      cookieOptions.sameSite = 'lax'
    }

    cookieStore.set(SESSION_COOKIE, token, cookieOptions)

    const swCookieOptions: Record<string, unknown> = {
      maxAge: SESSION_MAX_AGE,
      path: '/',
    }
    if (secure) {
      swCookieOptions.secure = true
      swCookieOptions.sameSite = 'lax'
    }
    cookieStore.set(SW_SESSION_COOKIE, crypto.randomUUID(), swCookieOptions)

    return token
  }

  async getSession(): Promise<AuthSession | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value

    if (!token) return null

    try {
      const payload = jwt.verify(token, getJWTSecret()) as unknown as { userId: number }
      const usuario = await prisma.usuario.findUnique({
        where: { id: payload.userId },
      })

      if (!usuario) return null

      return this.mapUser(usuario)
    } catch {
      return null
    }
  }

  async destroySession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    cookieStore.delete(SW_SESSION_COOKIE)
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const usuario = await prisma.usuario.findUnique({
      where: { email: credentials.email },
    })

    if (!usuario) throw new Error('Email ou senha inválidos')

    if (!usuario.senha) {
      throw new Error(
        'Esta conta usa login com Google. Entre pela opção "Continuar com Google".'
      )
    }

    const senhaCorreta = await bcrypt.compare(credentials.password, usuario.senha)
    if (!senhaCorreta) throw new Error('Email ou senha inválidos')

    await this.createSession(usuario.id)
    return this.mapUser(usuario)
  }

  async register(data: RegisterData): Promise<AuthSession> {
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: data.email },
    })
    if (usuarioExistente) throw new Error('Esse email já está cadastrado')

    const senhaHash = await bcrypt.hash(data.senha, BCRYPT_SALT)
    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
      },
    })

    await this.createSession(usuario.id)
    return this.mapUser(usuario)
  }

  async logout(): Promise<void> {
    await this.destroySession()
  }

  private mapUser(usuario: {
    id: number
    email: string
    nome: string
    bio?: string | null
    fotoUrl?: string | null
    aceitouTermos: boolean
    notificacoesAtivas: boolean
    notificarSistema: boolean
    criadoEm: Date
  }): AuthSession {
    return {
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        bio: usuario.bio,
        fotoUrl: usuario.fotoUrl,
        aceitouTermos: usuario.aceitouTermos,
        notificacoesAtivas: usuario.notificacoesAtivas,
        notificarSistema: usuario.notificarSistema,
        criadoEm: usuario.criadoEm,
      },
    }
  }
}
