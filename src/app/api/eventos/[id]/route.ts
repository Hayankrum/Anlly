import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterSessao } from '@/lib/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await obterSessao()
  if (!usuario) {
    return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 })
  }

  const { id } = await params
  const eventoId = parseInt(id, 10)
  if (isNaN(eventoId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const evento = await prisma.event.findUnique({
    where: { id: eventoId, usuarioId: usuario.id },
    include: { reminders: { orderBy: { notifyAt: 'asc' } } },
  })

  if (!evento) {
    return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 })
  }

  return NextResponse.json(evento)
}