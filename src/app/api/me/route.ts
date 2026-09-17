import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterSessao } from '@/lib/session'

export async function GET() {
  const usuario = await obterSessao()
  if (!usuario) {
    return NextResponse.json(null)
  }

  const fullUser = await prisma.usuario.findUnique({
    where: { id: usuario.id },
    select: {
      id: true,
      nome: true,
      email: true,
      bio: true,
      fotoUrl: true,
      senha: true,
      notificarComentarios: true,
      notificarSistema: true,
    },
  })

  if (!fullUser) {
    return NextResponse.json(null)
  }

  return NextResponse.json({
    id: fullUser.id,
    nome: fullUser.nome,
    email: fullUser.email,
    bio: fullUser.bio,
    fotoUrl: fullUser.fotoUrl,
    temSenha: !!fullUser.senha,
    notificarComentarios: fullUser.notificarComentarios,
    notificarSistema: fullUser.notificarSistema,
  })
}
