import { Suspense } from 'react'
import PostFormPage from '@/modules/posts/pages/PostFormPage'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function Page({ searchParams }: Props) {
  const { error } = await searchParams
  return (
    <Suspense>
      <PostFormPage error={error} />
    </Suspense>
  )
}
