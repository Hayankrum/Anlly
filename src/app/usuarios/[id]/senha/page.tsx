import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'
import AlterarSenhaPage from '@/modules/usuarios/pages/AlterarSenhaPage'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const usuarioLogado = await getUsuarioLogado()

  if (!usuarioLogado || usuarioLogado.id !== Number(id)) {
    redirect('/usuarios/login')
  }

  return <AlterarSenhaPage usuarioId={usuarioLogado.id} />
}
