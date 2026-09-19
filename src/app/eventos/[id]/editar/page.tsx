import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EventoFormPage from '@/modules/eventos/pages/EventoFormPage'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const eventoId = Number(id)
  if (isNaN(eventoId)) notFound()

  const evento = await prisma.event.findUnique({
    where: { id: eventoId },
    include: { reminders: true },
  })

  if (!evento) notFound()

  const usuario = await getUsuarioLogado()
  if (!usuario) {
    redirect(`/eventos/${evento.id}`)
  }

  return (
    <EventoFormPage
      evento={{
        id: evento.id,
        title: evento.title,
        description: evento.description,
        startsAt: evento.startsAt.toISOString(),
        endsAt: evento.endsAt ? evento.endsAt.toISOString() : null,
        allDay: evento.allDay,
        dias: Array.isArray(evento.dias)
          ? evento.dias.filter((d): d is string => typeof d === 'string')
          : null,
        locationText: evento.locationText,
        latitude: evento.latitude,
        longitude: evento.longitude,
        color: evento.color,
        reminders: evento.reminders.map((r) => ({ offsetMinutes: r.offsetMinutes })),
      }}
    />
  )
}