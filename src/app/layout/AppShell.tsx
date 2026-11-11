import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { InstallBanner } from '../../features/pwa/InstallBanner'
import { IOSInstallModal } from '../../features/pwa/IOSInstallModal'
import { UpdateToast } from '../../features/pwa/UpdateToast'
import { AvisoTermos } from '../../features/termos/AvisoTermos'
import { jaViuApresentacao } from '../../features/boas-vindas/primeiraVez'
import { soltarCampoFocado } from '../../shared/lib/dom'
import { useAlertaCota } from '../../shared/lib/useAlertaCota'
import { useSairComDoisToques } from '../../shared/lib/useSairComDoisToques'
import { BottomNav } from './BottomNav'
import { TopNav } from './TopNav'
import './shell.css'

export function AppShell() {
  const local = useLocation()
  useAlertaCota()
  useSairComDoisToques()

  // Primeira visita: desvia para a tela de apresentação antes de mostrar o app.
  // Lido uma única vez, já no primeiro render, para não piscar a home.
  const [apresentacaoVista] = useState(jaViuApresentacao)

  // Navegação: se um campo desmontou/perdeu o foco sem avisar, o teclado e a
  // barra de autocompletar do celular continuam na tela. Força a saída.
  // Depende de location.key para rodar em QUALQUER navegação (inclusive
  // repetir o mesmo link), e não só quando o caminho muda.
  useEffect(() => {
    soltarCampoFocado()
  }, [local.key])

  if (!apresentacaoVista) return <Navigate to="/boas-vindas" replace />

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
