import Link from 'next/link'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'
import { primeiroNome } from '@/lib/utils'
import HeroMinimal from '@/components/HeroMinimal'

export default async function Home() {
  const usuario = await getUsuarioLogado()

  return (
    <HeroMinimal>
      <h1 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        {usuario ? (
          <>
            <span className="block">Bem-vindo,</span>
            <span className="block text-2xl md:text-3xl font-medium mt-1 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
              {primeiroNome(usuario.nome)}
            </span>
          </>
        ) : (
          'Bem-vindo ao Meu App'
        )}
      </h1>

      <p className="leading-relaxed mb-8 max-w-md" style={{ color: 'var(--text-secondary)' }}>
        Um app de base com sistema de posts e autenticação de usuários.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          href="/posts"
          className="font-medium rounded-lg px-6 py-3 text-sm transition-colors text-center min-h-[44px] flex items-center justify-center"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          Ver posts
        </Link>

        {!usuario && (
          <Link
            href="/usuarios/login"
            className="rounded-lg px-6 py-3 text-sm transition-colors text-center min-h-[44px] flex items-center justify-center"
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
          >
            Entrar
          </Link>
        )}
      </div>
    </HeroMinimal>
  )
}
