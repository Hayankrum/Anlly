import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PostFormPage from '@/modules/posts/pages/PostFormPage'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params

  const post = await prisma.post.findUnique({
    where: { id: Number(id) }
  })

  if (!post) notFound()

  const usuario = await getUsuarioLogado()

  if (!usuario || usuario.id !== post.autorId) {
    redirect(`/posts/${post.id}`)
  }

  return <PostFormPage post={post} />
}