import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { InstallBanner } from '../../features/pwa/InstallBanner'
import { IOSInstallModal } from '../../features/pwa/IOSInstallModal'
import { UpdateToast } from '../../features/pwa/UpdateToast'
import { AvisoTermos } from '../../features/termos/AvisoTermos'
import { soltarCampoFocado } from '../../shared/lib/dom'
import { useAlertaCota } from '../../shared/lib/useAlertaCota'
import { BottomNav } from './BottomNav'
import { TopNav } from './TopNav'
import './shell.css'

export function AppShell() {
  const local = useLocation()
  useAlertaCota()

  // Navegação: se um campo desmontou/perdeu o foco sem avisar, o teclado e a
  // barra de autocompletar do celular continuam na tela. Força a saída.
  // Depende de location.key para rodar em QUALQUER navegação (inclusive
  // repetir o mesmo link), e não só quando o caminho muda.
  useEffect(() => {
    soltarCampoFocado()
  }, [local.key])

  return (
    <div className="shell">
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>

      <TopNav />

      <main className="shell-conteudo" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>

      <BottomNav />
      <InstallBanner />
      <IOSInstallModal />
      <UpdateToast />
      <AvisoTermos />
    </div>
  )
}
