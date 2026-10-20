import { NavLink } from 'react-router-dom'
import { CalendarDays, House, ListChecks, Moon, Sun, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import appConfig from '../app.config.json'
import { useSettings } from '../../features/settings/useSettings'
import { useSyncStatus } from '../../features/conta/useSyncStatus'
import { DESCRICOES_FASE, iconeDaFase } from '../../features/conta/sync-estado'

interface LinkNavegacao {
  to: string
  rotulo: string
  icone: LucideIcon
  exato?: boolean
}

const LINKS: LinkNavegacao[] = [
  { to: '/', rotulo: 'Início', icone: House, exato: true },
  { to: '/itens', rotulo: 'Itens', icone: ListChecks },
  { to: '/calendario', rotulo: 'Agenda', icone: CalendarDays },
  { to: '/conta', rotulo: 'Conta', icone: UserRound },
]

function estaEscuro(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function TopNav() {
  const { tema, definirTema } = useSettings()
  const statusSync = useSyncStatus()

  const escuro =
    tema === 'escuro' || (tema === 'sistema' && estaEscuro())

  const descricaoSync = DESCRICOES_FASE[statusSync.fase]
  const IconeSync = iconeDaFase(statusSync.fase)

  function alternarTema() {
    void definirTema(escuro ? 'claro' : 'escuro')
  }

  return (
    <nav className="top-nav" aria-label="Navegação principal">
      <div className="top-nav-interno">
        <NavLink to="/" className="top-nav-marca" title={appConfig.name}>
          <img
            src={`${import.meta.env.BASE_URL}icons/logo-nav.png`}
            alt=""
            aria-hidden="true"
          />
          <span>{appConfig.name}</span>
        </NavLink>

        <ul className="top-nav-lista">
          {LINKS.map(({ to, rotulo, icone: Icone, exato }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exato ?? false}
                className={({ isActive }) =>
                  `top-nav-link${isActive ? ' top-nav-link--ativo' : ''}`
                }
              >
                <Icone size={18} aria-hidden="true" />
                <span>{rotulo}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="top-nav-acoes">
          <NavLink
            to="/conta"
            className={({ isActive }) =>
              `top-nav-botao top-nav-status top-nav-status--${descricaoSync.tom}${
                isActive ? ' top-nav-botao--ativo' : ''
              }`
            }
            aria-label={`Conta e sincronização: ${descricaoSync.rotulo.toLowerCase()}`}
            title={`Sincronização: ${descricaoSync.rotulo}`}
          >
            <IconeSync
              size={18}
              aria-hidden="true"
              className={
                descricaoSync.girando ? 'top-nav-icone-girando' : undefined
              }
            />
          </NavLink>
          <button
            type="button"
            className="top-nav-botao"
            onClick={alternarTema}
            aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            title={escuro ? 'Tema claro' : 'Tema escuro'}
          >
            {escuro ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </nav>
  )
}
