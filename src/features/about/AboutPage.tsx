import {
  Cloud,
  CloudOff,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  Palette,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import appConfig from '../../app/app.config.json'
import { Button } from '../../shared/ui/Button'
import { useInstallPrompt } from '../pwa/useInstallPrompt'
import { ShareSection } from './ShareSection'
import './about.css'

const FUNCIONALIDADES = [
  { icone: CloudOff, texto: 'Suporte offline completo' },
  { icone: Smartphone, texto: 'PWA instalável na tela inicial' },
  { icone: Palette, texto: 'Tema claro e escuro' },
  { icone: HardDrive, texto: 'Backup em arquivo JSON' },
  { icone: Cloud, texto: 'Criar e sincronizar com conta' },
  { icone: ShieldCheck, texto: 'Sem rastreamento' },
  { icone: Database, texto: 'Dados salvos primeiro no dispositivo' },
] as const

export function AboutPage() {
  const { canInstall, isIOS, install } = useInstallPrompt()

  return (
    <div className="pagina sobre-pagina">
      <div className="pagina-cabecalho">
        <div>
          <h1 className="pagina-titulo">Sobre o aplicativo</h1>
        </div>
      </div>

      <section className="cartao">
        <img
          className="sobre-mascote"
          src={`${import.meta.env.BASE_URL}mascote.png`}
          alt=""
          aria-hidden="true"
        />
        <p className="sobre-texto">{appConfig.description.replace(/^Anlly\s*[—-]\s*/i, '')}</p>
      </section>

      <section className="cartao">
        <h2 className="cartao-titulo">Funcionalidades</h2>
        <ul className="sobre-funcionalidades">
          {FUNCIONALIDADES.map(({ icone: Icone, texto }) => (
            <li key={texto}>
              <Icone size={16} aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="cartao">
        <h2 className="cartao-titulo">Onde ficam os dados</h2>
        <p className="sobre-texto">
          Seus itens ficam salvos neste dispositivo. Nada sai sem conta conectada; a lista fica oculta fora da conta. Se os dados do navegador forem apagados ou o app desinstalado, os itens vão junto — exporte um backup periodicamente.
        </p>
        <Link className="sobre-link" to="/termos">
          Termos de uso e privacidade
          <ExternalLink size={16} aria-hidden="true" />
        </Link>
        <Link className="sobre-link" to="/conta">
          Ir para Conta
          <ExternalLink size={16} aria-hidden="true" />
        </Link>
        <Link className="sobre-link" to="/config">
          Ir para Configurações
          <ExternalLink size={16} aria-hidden="true" />
        </Link>
      </section>

      {canInstall ? (
        <section className="cartao">
          <h2 className="cartao-titulo">Instalar aplicativo</h2>
          <p className="sobre-texto">
            Instale o aplicativo na sua tela inicial para acesso rápido e melhor experiência
            offline.
          </p>
          <Button className="sobre-botao" onClick={() => void install()}>
            <Download size={18} aria-hidden="true" />
            {isIOS ? 'Como instalar no iPhone' : 'Instalar agora'}
          </Button>
        </section>
      ) : null}

      <section className="cartao">
        <h2 className="cartao-titulo">Como instalar</h2>
        <div className="sobre-passos">
          <div>
            <p className="sobre-passo-titulo">Chrome / Edge</p>
            <p className="sobre-passo-texto">
              Clique no ícone de instalar que aparece na barra de endereço do navegador.
            </p>
          </div>
          <div>
            <p className="sobre-passo-titulo">Firefox</p>
            <p className="sobre-passo-texto">Clique nos 3 pontos do menu → &quot;Instalar&quot;.</p>
          </div>
          <div>
            <p className="sobre-passo-titulo">Safari (iOS)</p>
            <p className="sobre-passo-texto">
              Toque no botão &quot;Compartilhar&quot; → &quot;Adicionar à Tela de Início&quot;.
            </p>
          </div>
        </div>
      </section>

      <ShareSection />
    </div>
  )
}
