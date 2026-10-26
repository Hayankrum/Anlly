import { ErroApi, fetchComTimeout } from '../../sync/api'
import {
  listaDispositivosSchema,
  type ListaDispositivos,
} from '@shared/sessoes'

async function erroDe(resposta: Response): Promise<ErroApi> {
  const corpo: unknown = await resposta.json().catch(() => null)
  const mensagem =
    typeof corpo === 'object' && corpo !== null && 'erro' in corpo
      ? String((corpo as { erro: unknown }).erro)
      : `HTTP ${resposta.status}`
  return new ErroApi(resposta.status, mensagem)
}

/** `null` quando não há sessão no servidor. */
export async function listarDispositivos(): Promise<ListaDispositivos | null> {
  const resposta = await fetchComTimeout('/api/sessoes')
  if (resposta.status === 401) return null
  if (!resposta.ok) throw await erroDe(resposta)
  const bruto: unknown = await resposta.json().catch(() => null)
  const parse = listaDispositivosSchema.safeParse(bruto)
  if (!parse.success) throw new ErroApi(resposta.status, 'Resposta de dispositivos inválida')
  return parse.data
}

export async function revogarDispositivo(id: string): Promise<void> {
  const resposta = await fetchComTimeout('/api/sessoes/revogar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!resposta.ok) throw await erroDe(resposta)
}

export async function revogarOutrosDispositivos(): Promise<number> {
  const resposta = await fetchComTimeout('/api/sessoes/revogar-outros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!resposta.ok) throw await erroDe(resposta)
  const corpo: unknown = await resposta.json().catch(() => null)
  const desconectados =
    typeof corpo === 'object' && corpo !== null && 'desconectados' in corpo
      ? Number((corpo as { desconectados: unknown }).desconectados)
      : 0
  return Number.isFinite(desconectados) ? desconectados : 0
}
