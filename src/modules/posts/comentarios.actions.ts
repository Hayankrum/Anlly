'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'
import { criarNotificacao } from '@/lib/notifications'

export async function criarComentario(postId: number, texto: string) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Você precisa estar logado para comentar' }

  if (!texto.trim()) return { error: 'O comentário não pode estar vazio' }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { autor: true },
  })
  if (!post) return { error: 'Post não encontrado' }

  await prisma.comentario.create({
    data: {
      texto: texto.trim(),
      postId,
      autorId: usuario.id,
    },
  })

  if (post.autorId !== usuario.id && post.autor.notificacoesAtivas) {
    await criarNotificacao({
      usuarioId: post.autorId,
      titulo: `${usuario.nome} comentou no seu post`,
      mensagem: texto.trim().slice(0, 100),
      url: `/posts/${postId}`,
      tipo: 'comentario',
    })
  }

  revalidatePath(`/posts/${postId}`)
  return { success: true }
}

export async function editarComentario(id: number, texto: string) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Não autorizado' }

  if (!texto.trim()) return { error: 'O comentário não pode estar vazio' }

  const comentario = await prisma.comentario.findUnique({ where: { id } })
  if (!comentario) return { error: 'Comentário não encontrado' }
  if (comentario.autorId !== usuario.id) return { error: 'Você só pode editar seus próprios comentários' }

  await prisma.comentario.update({
    where: { id },
    data: { texto: texto.trim() },
  })

  revalidatePath(`/posts/${comentario.postId}`)
  return { success: true }
}

export async function deletarComentario(id: number) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Não autorizado' }

  const comentario = await prisma.comentario.findUnique({ where: { id } })
  if (!comentario) return { error: 'Comentário não encontrado' }
  if (comentario.autorId !== usuario.id) return { error: 'Você só pode deletar seus próprios comentários' }

  await prisma.comentario.delete({ where: { id } })
  revalidatePath(`/posts/${comentario.postId}`)
  return { success: true }
}
