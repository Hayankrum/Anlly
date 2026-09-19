import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const parseIso = (value: string | null): Date | undefined => {
    if (!value) return undefined
    const d = new Date(value)
    return isNaN(d.getTime()) ? undefined : d
  }

  const from = parseIso(searchParams.get('from'))
  const to = parseIso(searchParams.get('to'))

  if (from && to && from.getTime() > to.getTime()) {
    return NextResponse.json({ error: 'Intervalo inválido' }, { status: 400 })
  }

  const eventos = await prisma.event.findMany({
    where: {
      ...(from ? { startsAt: { gte: from } } : {}),
      ...(to ? { startsAt: { lte: to } } : {}),
    },
    include: { reminders: { orderBy: { notifyAt: 'asc' } } },
    orderBy: { startsAt: 'asc' },
  })

  return NextResponse.json({ eventos })
}