'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePost, useUsuario } from '@/lib/useData'
import { primeiroNome } from '@/lib/utils'
import OfflineBanner from '@/components/OfflineBanner'
import BotaoDeletar from '../components/BotaoDeletar'
import FormComentario from '../components/FormComentario'
import ListaComentarios from '../components/ListaComentarios'
import MapaPosteClient from '@/modules/mapa/components/MapaPosteClient'
import { PostDetalheSkeleton } from '@/components/Skeletons'

export default function PostDetailPage({ id }: { id: number }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const { post, loading, fromCache } = usePost(id, refreshKey)
  const { usuario } = useUsuario()

  if (loading) {
    return <PostDetalheSkeleton />
  }

  if (!post) {
    return (
      <div>
        <OfflineBanner fromCache={fromCache} />
        <p style={{ color: 'var(--text-tertiary)' }}>Post não encontrado.</p>
        <Link href="/posts" className="text-sm mt-4 inline-block hover:underline" style={{ color: 'var(--text-tertiary)' }}>
          ← Voltar
        </Link>
      </div>
    )
  }

  const ehAutor = usuario?.id === post.autorId

  return (
    <div>
      <OfflineBanner fromCache={fromCache} />

      <Link
        href="/posts"
        className="text-sm transition-colors mb-6 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Voltar
      </Link>
      <h1 className="text-2xl font-semibold mb-2 break-words" style={{ color: 'var(--text-primary)' }}>{post.titulo}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
        por{' '}
        <Link href={`/usuarios/${post.autor.id}`} className="transition-colors hover:underline">
          {primeiroNome(post.autor.nome)}
        </Link>
      </p>
      <p className="text-sm whitespace-pre-wrap mb-6" style={{ color: 'var(--text-secondary)' }}>{post.conteudo}</p>

      {post.latitude && post.longitude && (
        <div className="mb-8">
          <h2 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Localização</h2>
          <MapaPosteClient latitude={post.latitude} longitude={post.longitude} titulo={post.titulo} />
        </div>
      )}

      {ehAutor && (
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/posts/${post.id}/editar`}
            className="rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
          >
            Editar
          </Link>
          <BotaoDeletar id={post.id} />
        </div>
      )}

      <div className="pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
        <ListaComentarios
          comentarios={post.comentarios}
          usuarioLogadoId={usuario?.id}
        />
        {usuario ? (
          <FormComentario postId={post.id} onSuccess={() => setRefreshKey((k) => k + 1)} />
        ) : (
          <p className="text-sm mt-4" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/usuarios/login" className="hover:underline" style={{ color: 'var(--text-primary)' }}>
              Faça login
            </Link>{' '}
            para comentar.
          </p>
        )}
      </div>
    </div>
  )
}
