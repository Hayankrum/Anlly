import { cookies, headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signOut } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'
import type {
  AuthProvider,
  AuthSession,
  LoginCredentials,
  RegisterData,
} from '../AuthProvider'

const SESSION_COOKIE = 'sessionToken'
const SW_SESSION_COOKIE = 'sw_session_id'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias
const BCRYPT_SALT = 10

export class NextAuthProvider implements AuthProvider {
  async isSecureConnection(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      return process.env.VERCEL === '1' || process.env.FORCE_HTTPS === 'true'
    }
    const h = await headers()
    const proto = h.get('x-forwarded-proto')
    if (proto) return proto === 'https'
    const host = h.get('host') ?? ''
    return !host.startsWith('localhost') && !host.startsWith('127.')
  }

  async createSession(userId: number): Promise<string> {
    const token = crypto.randomUUID()

    await prisma.sessao.create({
      data: {
        token,
        usuarioId: userId,
        expiraEm: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      },
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
    try {
      const cookieStore = await cookies()

      // Try custom session first
      const token = cookieStore.get(SESSION_COOKIE)?.value
      if (token) {
        const sessao = await prisma.sessao.findUnique({
          where: { token },
          include: { usuario: true },
        })
        if (sessao && sessao.expiraEm >= new Date()) {
          return this.mapUser(sessao.usuario)
        }
        if (sessao) await prisma.sessao.delete({ where: { token } })
      }

      // Fallback to NextAuth JWT
      try {
        const cookieHeader = cookieStore
          .getAll()
          .map((c) => `${c.name}=${c.value}`)
          .join('; ')
        const jwt = await getToken({
          req: { headers: { cookie: cookieHeader } },
          secret: process.env.AUTH_SECRET,
          secureCookie: await this.isSecureConnection(),
        })
        if (jwt?.email) {
          const usuario = await prisma.usuario.findUnique({
            where: { email: jwt.email },
          })
          if (usuario) return this.mapUser(usuario)
        }
      } catch {
        // NextAuth JWT failed, continue
      }

      return null
    } catch {
      // Database unreachable or any other error - return null gracefully
      return null
    }
  }

  async destroySession(): Promise<void> {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value

    if (token) {
      await prisma.sessao.deleteMany({ where: { token } })
      cookieStore.delete(SESSION_COOKIE)
    }

    cookieStore.delete(SW_SESSION_COOKIE)

    try {
      await signOut({ redirect: false })
    } catch {
      // ignore - may fail if no NextAuth session
    }
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
    notificarComentarios: boolean
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
        notificarComentarios: usuario.notificarComentarios,
        notificarSistema: usuario.notificarSistema,
        criadoEm: usuario.criadoEm,
      },
    }
  }
}
