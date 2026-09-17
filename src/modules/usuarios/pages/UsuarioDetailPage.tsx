import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'
import { primeiroNome } from '@/lib/utils'


interface Props {
  id: number
}

export default async function UsuarioDetailPage({ id }: Props) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: {
      posts: {
        orderBy: { criadoEm: 'desc' }
      }
    }
  })

  if (!usuario) notFound()

  const usuarioLogado = await getUsuarioLogado()
  const isDono = usuarioLogado?.id === usuario.id

  return (
    <div>
      <Link
        href="/posts"
        className="text-sm transition-colors mb-6 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Voltar
      </Link>

      <div className="flex items-start gap-5 mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          {usuario.nome.charAt(0).toUpperCase()}
        </div>

        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{usuario.nome}</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{usuario.email}</p>
        </div>
      </div>

      {usuario.bio && (
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{usuario.bio}</p>
      )}

      {isDono && (
        <div className="mb-8 pb-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex flex-wrap">
            <Link
              href={`/usuarios/${usuario.id}/editar`}
              className="text-xs font-medium px-3 py-1.5 transition-colors -ml-px first:ml-0 first:rounded-l-lg hover:underline"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
            >
              Editar perfil
            </Link>
            {usuario.senha && (
              <Link
                href={`/usuarios/${usuario.id}/senha`}
                className="text-xs font-medium px-3 py-1.5 transition-colors -ml-px hover:underline"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
              >
                Alterar senha
              </Link>
            )}
            <Link
              href="/usuarios/configuracoes"
              className="text-xs font-medium px-3 py-1.5 transition-colors -ml-px hover:underline"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
            >
              Configurações
            </Link>
            <Link
              href="/usuarios/sobre"
              className="text-xs font-medium px-3 py-1.5 transition-colors -ml-px last:rounded-r-lg hover:underline"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
            >
              Sobre
            </Link>
          </div>
        </div>
      )}

      <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Posts de {primeiroNome(usuario.nome)}</h2>

      {usuario.posts.length === 0 && (
        <p style={{ color: 'var(--text-tertiary)' }}>Nenhum post ainda.</p>
      )}

      <div className="flex flex-col gap-4">
        {usuario.posts.map(post => (
          <div key={post.id} className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="font-medium text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{post.titulo}</h3>
            <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{post.conteudo.length > 150 ? post.conteudo.slice(0, 150) + '...' : post.conteudo}</p>
            <Link
              href={`/posts/${post.id}`}
              className="text-sm transition-colors hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Ver post →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
