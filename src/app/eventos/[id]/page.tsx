'use client'

import { use } from 'react'
import EventoDetailPage from '@/modules/eventos/pages/EventoDetailPage'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <EventoDetailPage id={Number(id)} />
}