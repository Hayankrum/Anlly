import { prisma } from '@/lib/prisma'
import MapaGlobalClient from '@/modules/mapa/components/MapaGlobalClient'

export default async function MapaPage() {
  const posts = await prisma.post.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    include: { autor: true },
    orderBy: { criadoEm: 'desc' },
  })

  const postsComCoordenadas = posts.map(post => ({
    id: post.id,
    titulo: post.titulo,
    latitude: post.latitude!,
    longitude: post.longitude!,
    autorNome: post.autor.nome,
    criadoEm: post.criadoEm.toISOString(),
  }))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Mapa Global</h1>
      <MapaGlobalClient posts={postsComCoordenadas} />
    </div>
  )
}
