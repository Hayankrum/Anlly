import { prisma } from '@/lib/prisma'
import MapaGlobalClient from '@/modules/mapa/components/MapaGlobalClient'

export const dynamic = 'force-dynamic'

export default async function MapaPage() {
  const eventos = await prisma.event.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    orderBy: { startsAt: 'asc' },
  })

  const eventosComCoordenadas = eventos.map(evento => ({
    id: evento.id,
    titulo: evento.title,
    startsAt: evento.startsAt.toISOString(),
    latitude: evento.latitude!,
    longitude: evento.longitude!,
    done: evento.done,
  }))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Mapa de eventos</h1>
      <MapaGlobalClient eventos={eventosComCoordenadas} />
    </div>
  )
}
