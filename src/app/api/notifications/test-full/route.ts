import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CenarioResultado {
  bloqueado: boolean
  motivo: string | null
  receberiaNotificacao: boolean
}

interface UsuarioResultado {
  usuario: { id: number; nome: string; email: string }
  preferencias: {
    notificacoesAtivas: boolean
    notificarComentarios: boolean
    notificarSistema: boolean
  }
  inscricoes: number
  cenarios: Record<string, CenarioResultado>
}

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Rota indisponível em produção' }, { status: 403 })
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        notificacoesAtivas: true,
        notificarComentarios: true,
        notificarSistema: true,
        inscricoes: {
          select: { id: true },
        },
      },
      orderBy: { id: 'asc' },
    })

    const testeCompleto: UsuarioResultado[] = usuarios.map((u) => {
      const resultados: UsuarioResultado = {
        usuario: { id: u.id, nome: u.nome, email: u.email },
        preferencias: {
          notificacoesAtivas: u.notificacoesAtivas,
          notificarComentarios: u.notificarComentarios,
          notificarSistema: u.notificarSistema,
        },
        inscricoes: u.inscricoes.length,
        cenarios: {},
      }

      const cenarios = [
        { tipo: 'comentario', label: 'Comentário' },
        { tipo: 'sistema', label: 'Sistema' },
      ]

      for (const cenario of cenarios) {
        let bloqueado = false
        let motivo = ''

        if (!u.notificacoesAtivas) {
          bloqueado = true
          motivo = 'Notificações desativadas'
        } else if (cenario.tipo === 'comentario' && !u.notificarComentarios) {
          bloqueado = true
          motivo = 'Tipo comentário desativado'
        } else if (cenario.tipo === 'sistema' && !u.notificarSistema) {
          bloqueado = true
          motivo = 'Tipo sistema desativado'
        }

        resultados.cenarios[cenario.tipo] = {
          bloqueado,
          motivo: bloqueado ? motivo : null,
          receberiaNotificacao: !bloqueado && u.inscricoes.length > 0,
        }
      }

      return resultados
    })

    return NextResponse.json({ testeCompleto })
  } catch (error) {
    console.error('[Test Full] Error:', error)
    return NextResponse.json({ error: 'Erro ao executar teste completo' }, { status: 500 })
  }
}
