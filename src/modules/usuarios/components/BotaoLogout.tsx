import { logout } from '../usuarios.actions'

export default function BotaoLogout() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm transition-colors hover:underline"
        style={{ color: 'var(--text-secondary)' }}
      >
        Sair
      </button>
    </form>
  )
}