import { ErroApi, fetchComTimeout, obterSessao } from '../../sync/api'
import type { SessaoLocal } from '@shared/schemas/usuario'

export const LIMITE_SENHA = 8

const MENSAGENS_CODIGO: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail.',
  WEAK_PASSWORD: `A senha é fraca. Use pelo menos ${LIMITE_SENHA} caracteres.`,
  INVALID_EMAIL: 'Informe um e-mail válido.',
  MISSING_PASSWORD: 'Informe a senha.',
  INVALID_TOKEN: 'O link de recuperação é inválido ou expirou. Solicite um novo.',
  EXPIRED_TOKEN: 'O link de recuperação expirou. Solicite um novo.',
}

async function erroDeResposta(resposta: Response): Promise<ErroApi> {
  const corpo: unknown = await resposta.json().catch(() => null)
  const codigo =
    typeof corpo === 'object' && corpo !== null && 'code' in corpo
      ? String((corpo as { code: unknown }).code)
      : null
  const mensagem =
    (codigo !== null ? MENSAGENS_CODIGO[codigo] : undefined) ??
    (resposta.status === 429
      ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
      : resposta.status >= 500
        ? 'Servidor indisponível. Tente novamente em instantes.'
        : 'Não foi possível completar a operação.')
  return new ErroApi(resposta.status, mensagem)
}

async function sessaoAposAutenticacao(resposta: Response): Promise<SessaoLocal> {
  if (!resposta.ok) throw await erroDeResposta(resposta)
  await resposta.json().catch(() => null)
  const sessao = await obterSessao()
  if (sessao === null) throw new ErroApi(500, 'Sessão não estabelecida. Tente novamente.')
  return sessao
}

export interface EntradaCadastro {
  email: string
  senha: string
  nome: string
}

export interface EntradaLogin {
  email: string
  senha: string
}

export async function criarConta(entrada: EntradaCadastro): Promise<SessaoLocal> {
  const resposta = await fetchComTimeout('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: entrada.email,
      password: entrada.senha,
      ...(entrada.nome.trim() === '' ? {} : { name: entrada.nome.trim() }),
    }),
  })
  return sessaoAposAutenticacao(resposta)
}

export async function entrar(entrada: EntradaLogin): Promise<SessaoLocal> {
  const resposta = await fetchComTimeout('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: entrada.email, password: entrada.senha }),
  })
  return sessaoAposAutenticacao(resposta)
}

export async function sair(): Promise<void> {
  const resposta = await fetchComTimeout('/api/auth/sign-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!resposta.ok && resposta.status !== 401) throw await erroDeResposta(resposta)
}

export async function solicitarRedefinicao(email: string): Promise<void> {
  const resposta = await fetchComTimeout('/api/auth/forget-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, redirectTo: '/#/redefinir-senha' }),
  })
  // 200 sempre (não revela se o e-mail existe); 404 = SMTP não configurado
  if (resposta.status === 404) {
    throw new ErroApi(404, 'Recuperação de senha indisponível. Contate o suporte.')
  }
  if (!resposta.ok) throw await erroDeResposta(resposta)
}

export async function redefinirSenha(token: string, novaSenha: string): Promise<void> {
  const resposta = await fetchComTimeout('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword: novaSenha }),
  })
  if (!resposta.ok) throw await erroDeResposta(resposta)
}

export async function trocarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  const resposta = await fetchComTimeout('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: senhaAtual, newPassword: novaSenha }),
  })
  if (!resposta.ok) throw await erroDeResposta(resposta)
}
