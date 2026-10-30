import { NavLink } from 'react-router-dom'
import { CalendarDays, House, List, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface LinkNavegacao {
  to: string
  rotulo: string
  icone: LucideIcon
  exato?: boolean
}

const LINKS: LinkNavegacao[] = [
  { to: '/', rotulo: 'Início', icone: House, exato: true },
  { to: '/itens', rotulo: 'Itens', icone: List },
  { to: '/calendario', rotulo: 'Agenda', icone: CalendarDays },
  { to: '/conta', rotulo: 'Conta', icone: UserRound },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <ul className="bottom-nav-lista">
        {LINKS.map(({ to, rotulo, icone: Icone, exato }) => (
          <li key={to} className="bottom-nav-item">
            <NavLink
              to={to}
              end={exato ?? false}
              aria-label={rotulo}
              className={({ isActive }) =>
                `bottom-nav-link${isActive ? ' bottom-nav-link--ativo' : ''}`
              }
            >
              <Icone size={22} aria-hidden="true" />
              <span className="bottom-nav-rotulo">{rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
