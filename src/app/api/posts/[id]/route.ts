import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const postId = parseInt(id)
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      autor: {
        select: { id: true, nome: true, fotoUrl: true },
      },
      comentarios: {
        include: {
          autor: {
            select: { id: true, nome: true, fotoUrl: true },
          },
        },
        orderBy: { criadoEm: 'desc' },
      },
    },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
  }

  return NextResponse.json(post)
}
