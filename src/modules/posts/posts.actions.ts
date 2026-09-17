'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'

const MAX_TITULO = 200
const MAX_CONTEUDO = 10000

function sanitizeInput(value: string): string {
  return value.replace(/[<>]/g, '').trim()
}

async function obterPostDoUsuario(id: number) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Você precisa estar logado' as const, post: null }

  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) return { error: 'Post não encontrado' as const, post: null }
  if (post.autorId !== usuario.id) return { error: 'Você não pode acessar um post que não é seu' as const, post: null }

  return { post, usuario }
}

export async function criarPost(titulo: string, conteudo: string, latitude?: number | null, longitude?: number | null) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Você precisa estar logado para criar um post' }

  const tituloClean = sanitizeInput(titulo)
  const conteudoClean = sanitizeInput(conteudo)

  if (!tituloClean || tituloClean.length < 3) return { error: 'Título deve ter pelo menos 3 caracteres' }
  if (tituloClean.length > MAX_TITULO) return { error: `Título deve ter no máximo ${MAX_TITULO} caracteres` }
  if (!conteudoClean || conteudoClean.length < 3) return { error: 'Conteúdo deve ter pelo menos 3 caracteres' }
  if (conteudoClean.length > MAX_CONTEUDO) return { error: `Conteúdo deve ter no máximo ${MAX_CONTEUDO} caracteres` }

  if (latitude != null && (latitude < -90 || latitude > 90)) return { error: 'Latitude inválida' }
  if (longitude != null && (longitude < -180 || longitude > 180)) return { error: 'Longitude inválida' }

  await prisma.post.create({
    data: {
      titulo: tituloClean,
      conteudo: conteudoClean,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      autorId: usuario.id,
    }
  })
  revalidatePath('/posts')
  revalidatePath('/mapa')
}

export async function deletarPost(id: number) {
  const { error } = await obterPostDoUsuario(id)
  if (error) return { error }

  await prisma.post.delete({ where: { id } })
  revalidatePath('/posts')
  revalidatePath('/mapa')
}

export async function editarPost(id: number, titulo: string, conteudo: string, latitude?: number | null, longitude?: number | null) {
  const { error } = await obterPostDoUsuario(id)
  if (error) return { error }

  const tituloClean = sanitizeInput(titulo)
  const conteudoClean = sanitizeInput(conteudo)

  if (!tituloClean || tituloClean.length < 3) return { error: 'Título deve ter pelo menos 3 caracteres' }
  if (tituloClean.length > MAX_TITULO) return { error: `Título deve ter no máximo ${MAX_TITULO} caracteres` }
  if (!conteudoClean || conteudoClean.length < 3) return { error: 'Conteúdo deve ter pelo menos 3 caracteres' }
  if (conteudoClean.length > MAX_CONTEUDO) return { error: `Conteúdo deve ter no máximo ${MAX_CONTEUDO} caracteres` }

  if (latitude != null && (latitude < -90 || latitude > 90)) return { error: 'Latitude inválida' }
  if (longitude != null && (longitude < -180 || longitude > 180)) return { error: 'Longitude inválida' }

  await prisma.post.update({
    where: { id },
    data: {
      titulo: tituloClean,
      conteudo: conteudoClean,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    }
  })
  revalidatePath('/posts')
  revalidatePath('/mapa')
  redirect(`/posts/${id}`)
}
