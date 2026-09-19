import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'


interface Props {
  id: number
}

export default async function UsuarioDetailPage({ id }: Props) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
  })

  if (!usuario) notFound()

  const usuarioLogado = await getUsuarioLogado()
  const isDono = usuarioLogado?.id === usuario.id

  return (
    <div>
      <Link
        href="/"
        className="text-sm transition-colors mb-6 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Início
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

    </div>
  )
}
