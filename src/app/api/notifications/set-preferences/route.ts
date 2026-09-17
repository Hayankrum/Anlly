import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Rota indisponível em produção' }, { status: 403 })
    }

    const { usuarioId, notificacoesAtivas, notificarComentarios, notificarSistema } = await request.json()

    if (!usuarioId) {
      return NextResponse.json({ error: 'usuarioId é obrigatório' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const dadosAtualizacao: Record<string, boolean> = {}
    if (notificacoesAtivas !== undefined) dadosAtualizacao.notificacoesAtivas = notificacoesAtivas
    if (notificarComentarios !== undefined) dadosAtualizacao.notificarComentarios = notificarComentarios
    if (notificarSistema !== undefined) dadosAtualizacao.notificarSistema = notificarSistema

    const atualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: dadosAtualizacao,
      select: {
        id: true,
        nome: true,
        notificacoesAtivas: true,
        notificarComentarios: true,
        notificarSistema: true,
      },
    })

    return NextResponse.json({ success: true, usuario: atualizado })
  } catch (error) {
    console.error('[Set Preferences] Error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar preferências' }, { status: 500 })
  }
}
