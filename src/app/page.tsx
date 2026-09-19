import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'
import HomePage from '@/modules/eventos/pages/HomePage'

export default async function Home() {
  const usuario = await getUsuarioLogado()

  return <HomePage usuarioNome={usuario?.nome ?? null} />
}
