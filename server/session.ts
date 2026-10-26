import type { Context } from 'hono'
import { auth } from './auth'

export interface SessaoInfo {
  userId: string
  email: string
  /** Id da linha de sessão no banco (better-auth Session.id). */
  sessaoId: string
}

export async function exigirSessao(c: Context): Promise<SessaoInfo | null> {
  // disableCookieCache: ignora o cache de cookie (5 min) do better-auth e vai
  // ao banco a cada chamada. Sem isto, um dispositivo revogado em
  // "Dispositivos conectados" continuaria lendo e enviando dados por até
  // 5 minutos — com a consulta direta, a revogação vale já na sync seguinte.
  // É o único ponto de validação de sessão do servidor: o custo é um SELECT
  // por requisição autenticada (token tem índice único).
  const sessao = await auth.api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
  })
  if (!sessao) return null
  return { userId: sessao.user.id, email: sessao.user.email, sessaoId: sessao.session.id }
}
