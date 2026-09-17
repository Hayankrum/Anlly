'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { criarSessao, destruirSessao, obterSessao } from '@/lib/session'

const MIN_SENHA = 8
const MAX_SENHA = 128
const MAX_NOME = 50
const BCRYPT_SALT = 10

function validarSenha(senha: string): string | null {
  if (senha.length < MIN_SENHA) return `Senha deve ter no mínimo ${MIN_SENHA} caracteres`
  if (senha.length > MAX_SENHA) return `Senha deve ter no máximo ${MAX_SENHA} caracteres`
  return null
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isContaGoogle(usuario: { senha: string }): boolean {
  return !usuario.senha
}

// ---------- PERFIL ----------

export async function editarPerfil(id: number, nome: string, bio: string) {
  const usuarioLogado = await obterSessao()
  if (!usuarioLogado) return { error: 'Não autorizado' }
  if (usuarioLogado.id !== id) return { error: 'Você só pode editar seu próprio perfil' }

  if (!nome.trim()) return { error: 'Nome é obrigatório' }
  if (nome.trim().length > MAX_NOME) return { error: `Nome deve ter no máximo ${MAX_NOME} caracteres` }

  await prisma.usuario.update({
    where: { id },
    data: {
      nome: nome.trim(),
      bio: bio.trim() || null,
    }
  })
  redirect(`/usuarios/${id}`)
}

export async function deletarUsuario(id: number, senha: string) {
  const usuarioLogado = await obterSessao()
  if (!usuarioLogado) return { error: 'Não autorizado' }
  if (usuarioLogado.id !== id) return { error: 'Você só pode deletar sua própria conta' }

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) return { error: 'Usuário não encontrado' }

  if (!isContaGoogle(usuario)) {
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
    if (!senhaCorreta) return { error: 'Senha incorreta' }
  }

  await destruirSessao()
  await prisma.usuario.delete({ where: { id } })
  revalidatePath('/usuarios')
  redirect('/usuarios/login')
}

// ---------- REGISTRO ----------

export async function registrar(nome: string, email: string, senha: string, confirmarSenha: string, aceitouTermos: boolean) {
  if (nome.length > MAX_NOME) return { error: `Nome deve ter no máximo ${MAX_NOME} caracteres` }
  if (senha !== confirmarSenha) return { error: 'As senhas não conferem' }
  if (!aceitouTermos) return { error: 'Você deve aceitar os Termos de Uso e Compromisso' }

  const erroSenha = validarSenha(senha)
  if (erroSenha) return { error: erroSenha }
  if (!validarEmail(email)) return { error: 'Email inválido' }

  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } })
  if (usuarioExistente) return { error: 'Esse email já está cadastrado' }

  const senhaHash = await bcrypt.hash(senha, BCRYPT_SALT)
  const usuario = await prisma.usuario.create({ data: { nome, email, senha: senhaHash, aceitouTermos } })

  await criarSessao(usuario.id)
  redirect('/')
}

// ---------- LOGIN ----------

export async function login(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) return { error: 'Email ou senha inválidos' }

  if (isContaGoogle(usuario)) {
    return { error: 'Esta conta usa login com Google. Entre pela opção "Continuar com Google".' }
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
  if (!senhaCorreta) return { error: 'Email ou senha inválidos' }

  await criarSessao(usuario.id)
  redirect('/')
}

// ---------- LOGOUT ----------

export async function logout() {
  await destruirSessao()
  redirect('/usuarios/login')
}

// ---------- ALTERAR SENHA ----------

export async function alterarSenha(id: number, senhaAtual: string, novaSenha: string, confirmarSenha: string) {
  const usuarioLogado = await obterSessao()
  if (!usuarioLogado) return { error: 'Não autorizado' }
  if (usuarioLogado.id !== id) return { error: 'Você só pode alterar sua própria senha' }

  if (novaSenha !== confirmarSenha) return { error: 'As senhas não conferem' }

  const erroSenha = validarSenha(novaSenha)
  if (erroSenha) return { error: erroSenha }

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) return { error: 'Usuário não encontrado' }

  if (isContaGoogle(usuario)) {
    return { error: 'Esta conta usa login com Google e não possui senha para alterar.' }
  }

  const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha)
  if (!senhaCorreta) return { error: 'Senha atual incorreta' }

  const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_SALT)
  await prisma.usuario.update({ where: { id }, data: { senha: senhaHash } })

  return { success: 'Senha alterada com sucesso' }
}

// ---------- NOTIFICAÇÕES ----------

export async function toggleNotificacoes(enabled: boolean) {
  const usuarioLogado = await obterSessao()
  if (!usuarioLogado) return { error: 'Não autorizado' }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioLogado.id } })
  if (!usuario) return { error: 'Usuário não encontrado' }

  await prisma.usuario.update({
    where: { id: usuarioLogado.id },
    data: { notificacoesAtivas: enabled },
  })

  return { success: true }
}

export async function atualizarPreferenciasNotificacao(preferencias: {
  notificarComentarios?: boolean
  notificarSistema?: boolean
}) {
  const usuarioLogado = await obterSessao()
  if (!usuarioLogado) return { error: 'Não autorizado' }

  await prisma.usuario.update({
    where: { id: usuarioLogado.id },
    data: preferencias,
  })

  return { success: true }
}

// ---------- TERMOS ----------

export async function aceitarTermos() {
  const usuarioLogado = await obterSessao()
  if (!usuarioLogado) return { error: 'Não autorizado' }

  await prisma.usuario.update({
    where: { id: usuarioLogado.id },
    data: { aceitouTermos: true },
  })

  revalidatePath('/')
  return { success: 'Termos aceitos com sucesso' }
}

// ---------- HELPERS ----------

export async function getUsuarioLogado() {
  return obterSessao()
}
