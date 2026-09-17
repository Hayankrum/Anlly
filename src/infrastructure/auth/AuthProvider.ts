export interface AuthUser {
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
}

export interface AuthSession {
  user: AuthUser
  token?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  nome: string
  email: string
  senha: string
}

export interface AuthProvider {
  createSession(userId: number): Promise<string>
  getSession(): Promise<AuthSession | null>
  destroySession(): Promise<void>
  login(credentials: LoginCredentials): Promise<AuthSession>
  register(data: RegisterData): Promise<AuthSession>
  logout(): Promise<void>
  isSecureConnection(): Promise<boolean>
}
