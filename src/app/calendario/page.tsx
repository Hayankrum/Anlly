import CalendarioPage from '@/modules/eventos/pages/CalendarioPage'

interface Props {
  searchParams: Promise<{ mes?: string }>
}

export default async function Page({ searchParams }: Props) {
  const { mes } = await searchParams

  return <CalendarioPage mesInicial={mes ?? null} />
}
