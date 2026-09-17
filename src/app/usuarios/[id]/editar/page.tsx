import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'
import EditarPerfilPage from '@/modules/usuarios/pages/EditarPerfilPage'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const usuarioLogado = await getUsuarioLogado()

  if (!usuarioLogado || usuarioLogado.id !== Number(id)) {
    redirect('/usuarios/login')
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(id) },
    select: { id: true, nome: true, bio: true }
  })

  if (!usuario) notFound()

  return <EditarPerfilPage usuario={usuario} />
}
