'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SinoNotificacoes from '@/modules/notificacoes/SinoNotificacoes'

interface Usuario {
  id: number
  nome: string
}

const navItems = [
  { href: '/', title: 'Agenda', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { href: '/calendario', title: 'Calendário', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
  { href: '/eventos', title: 'Notas', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )},
]

export default function Navbar({ usuario }: { usuario: Usuario | null }) {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 hidden md:block px-4 pt-3">
      <div
        className="max-w-3xl mx-auto flex items-center gap-2 rounded-2xl px-4 py-2 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 85%, transparent)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <Link href="/" className="flex items-center mr-2" title="Meu App">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="Meu App" className="h-6 w-auto" />
        </Link>

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="transition-all flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--btn-secondary-bg)' : 'transparent',
              }}
              title={item.title}
            >
              {item.icon}
              <span className="hidden lg:inline">{item.title}</span>
            </Link>
          )
        })}

        <div className="ml-auto flex items-center gap-3">
          {usuario && <SinoNotificacoes />}
          {usuario ? (
            <Link
              href={`/usuarios/${usuario.id}`}
              className="transition-all flex items-center gap-2 rounded-xl px-2 py-1.5"
              title={usuario.nome}
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
              className="rounded-xl px-4 py-2 text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
