import PostListPage from '@/modules/posts/pages/PostListPage'

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function Page({ searchParams }: Props) {
  const { page } = await searchParams
  const pagina = Math.max(1, parseInt(page || '1', 10) || 1)
  return <PostListPage page={pagina} />
}