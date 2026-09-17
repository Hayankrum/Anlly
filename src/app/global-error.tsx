'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#09090b', color: '#fafafa' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>💥</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Erro crítico</h1>
          <p style={{ marginBottom: '24px', maxWidth: '400px', color: '#a1a1aa' }}>
            Ocorreu um erro inesperado que impediu o funcionamento do aplicativo.
          </p>
          {error.digest && (
            <p style={{ marginBottom: '24px', fontSize: '12px', color: '#52525b' }}>
              Código do erro: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#fafafa', cursor: 'pointer', fontSize: '14px' }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  )
}
