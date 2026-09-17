'use client'

import { use } from 'react'
import PostDetailPage from '@/modules/posts/pages/PostDetailPage'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PostDetailPage id={Number(id)} />
}
