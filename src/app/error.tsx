'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="text-5xl mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-tertiary)' }}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
        Algo deu errado
      </h2>
      <p className="text-sm mb-6 max-w-md" style={{ color: 'var(--text-tertiary)' }}>
        Ocorreu um erro inesperado. Tente recarregar a pagina.
      </p>
      {error.digest && (
        <p className="text-xs mb-4 font-mono" style={{ color: 'var(--text-tertiary)' }}>
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
