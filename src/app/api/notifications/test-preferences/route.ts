import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Rota indisponível em produção' }, { status: 403 })
    }

    const { usuarioId, tipo = 'sistema' } = await request.json()

    if (!usuarioId) {
      return NextResponse.json({ error: 'usuarioId é obrigatório' }, { status: 400 })
    }

    if (tipo !== 'comentario' && tipo !== 'sistema') {
      return NextResponse.json({ error: 'Tipo deve ser "comentario" ou "sistema"' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        notificacoesAtivas: true,
        notificarComentarios: true,
        notificarSistema: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const resultado: Record<string, unknown> = {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      tipo,
      preferencias: {
        notificacoesAtivas: usuario.notificacoesAtivas,
        notificarComentarios: usuario.notificarComentarios,
        notificarSistema: usuario.notificarSistema,
      },
      teste: {},
    }

    if (!usuario.notificacoesAtivas) {
      resultado.teste = {
        resultado: 'BLOQUEADO',
        motivo: 'Usuário com notificações desativadas',
        notificacaoEnviada: false,
      }
      return NextResponse.json(resultado)
    }

    if (tipo === 'comentario' && !usuario.notificarComentarios) {
      resultado.teste = {
        resultado: 'BLOQUEADO',
        motivo: 'Usuário desativou notificações de comentários',
        notificacaoEnviada: false,
      }
      return NextResponse.json(resultado)
    }

    if (tipo === 'sistema' && !usuario.notificarSistema) {
      resultado.teste = {
        resultado: 'BLOQUEADO',
        motivo: 'Usuário desativou notificações de sistema',
        notificacaoEnviada: false,
      }
      return NextResponse.json(resultado)
    }

    resultado.teste = {
      resultado: 'PERMITIDO',
      motivo: `Usuário tem notificações de ${tipo} ativadas`,
      notificacaoEnviada: true,
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[Test Preferencias] Error:', error)
    return NextResponse.json({ error: 'Erro ao testar preferências' }, { status: 500 })
  }
}
