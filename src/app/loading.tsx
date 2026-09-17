export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div
        className="w-10 h-10 border-4 rounded-full animate-spin"
        style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-primary)' }}
      />
      <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
    </div>
  )
}
