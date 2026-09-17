import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Página não encontrada</h1>
      <p className="mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Link
        href="/"
        className="border px-6 py-3 rounded-lg transition-colors"
        style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
      >
        Voltar ao Início
      </Link>
    </div>
  )
}
