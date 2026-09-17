import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ registered: false })
    }

    const inscricao = await prisma.inscricaoPush.findUnique({
      where: { endpoint },
      select: { id: true },
    })

    return NextResponse.json({ registered: !!inscricao })
  } catch (error) {
    console.error('[Check] Error:', error)
    return NextResponse.json({ registered: false })
  }
}
