import { Suspense } from 'react'
import EventoFormPage from '@/modules/eventos/pages/EventoFormPage'

interface Props {
  searchParams: Promise<{ error?: string; data?: string }>
}

export default async function Page({ searchParams }: Props) {
  const { error, data } = await searchParams

  const dataInicial = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null

  return (
    <Suspense>
      <EventoFormPage error={error} dataInicial={dataInicial} />
    </Suspense>
  )
}
