import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const skip = (page - 1) * limit

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      include: {
        autor: {
          select: { id: true, nome: true, fotoUrl: true },
        },
      },
      orderBy: { criadoEm: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count(),
  ])

  return NextResponse.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
