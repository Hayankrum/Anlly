'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SinoNotificacoes from '@/modules/notificacoes/SinoNotificacoes'

interface Usuario {
  id: number
  nome: string
}

const navItems = [
  { href: '/', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )},
  { href: '/calendario', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M8 14h.01"/>
      <path d="M12 14h.01"/>
      <path d="M16 14h.01"/>
      <path d="M8 18h.01"/>
      <path d="M12 18h.01"/>
      <path d="M16 18h.01"/>
    </svg>
  )},
  { href: '/mapa', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  )},
]

export default function MobileBottomNav({ usuario }: { usuario: Usuario | null }) {
  const pathname = usePathname()

  const linkClass = () =>
    `flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-[11px] font-medium transition-all`

  const activeStyle = (isActive: boolean) => ({
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--btn-secondary-bg)' : 'transparent',
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-3">
      <div
        className="flex items-center justify-center gap-2 rounded-2xl px-4 py-2 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 85%, transparent)',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
        }}
      >
        {navItems.map(item => {
          const isActive = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass()}
              style={activeStyle(isActive)}
            >
              {item.icon}
            </Link>
          )
        })}

        {usuario && (
          <Link
            href="/notificacoes"
            className={linkClass()}
            style={activeStyle(pathname === '/notificacoes')}
          >
            <SinoNotificacoes showLink={false} activeColor={pathname === '/notificacoes' ? 'var(--text-primary)' : undefined} />
          </Link>
        )}

        {usuario ? (
          <Link
            href={`/usuarios/${usuario.id}`}
            className={linkClass()}
            style={activeStyle(pathname.startsWith(`/usuarios/${usuario.id}`))}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
              }}
            >
              {usuario.nome.charAt(0).toUpperCase()}
            </span>
          </Link>
        ) : (
          <Link
            href="/usuarios/login"
            className={linkClass()}
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </Link>
        )}
      </div>
    </nav>
  )
}