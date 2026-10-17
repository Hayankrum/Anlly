import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { TERMOS_VERSAO } from '@shared/termos'
import { Button } from '../../shared/ui/Button'
import { formatarData } from '../../shared/lib/date'
import { useAceiteTermos } from '../conta/useTermos'
import { SECOES_TERMOS, TERMOS_PUBLICADO_EM } from './conteudo'
import './termos.css'

export function TermosPage() {
  const { estado, erro, aceitando, aceitarAgora } = useAceiteTermos()
  const pendente = estado === 'pendente'

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <div>
          <p className="pagina-subtitulo">
            <Link className="termos-voltar" to="/">
              <ArrowLeft size={14} aria-hidden="true" />
              Início
            </Link>
          </p>
          <h1 className="pagina-titulo">Termos de uso e privacidade</h1>
          <p className="pagina-subtitulo termos-versao">
            Versão {TERMOS_VERSAO} · publicado em {formatarData(TERMOS_PUBLICADO_EM)}
          </p>
        </div>
      </div>

      {pendente ? (
        <section className="cartao termos-aceite" aria-labelledby="titulo-aceite-termos">
          <h2 className="cartao-titulo" id="titulo-aceite-termos">
            Você ainda não aceitou estes termos
          </h2>
          <p className="termos-texto">
            A sincronização com a nuvem fica suspensa até o aceite. Seus itens continuam salvos
            neste aparelho.
          </p>
          {erro ? (
            <p className="termos-erro" role="alert">
              {erro}
            </p>
          ) : null}
          <div className="termos-aceite-acoes">
            <Button variante="primario" onClick={() => void aceitarAgora()} disabled={aceitando}>
              <ShieldCheck size={16} aria-hidden="true" />
              {aceitando ? 'Registrando…' : 'Li e aceito os termos'}
            </Button>
          </div>
        </section>
      ) : null}

      <nav className="termos-indice cartao" aria-label="Seções dos termos">
        <p className="termos-indice-titulo">Nesta página</p>
        <ul>
          {SECOES_TERMOS.map((secao) => (
            <li key={secao.id}>
              <a href={`#${secao.id}`}>{secao.titulo}</a>
            </li>
          ))}
        </ul>
      </nav>

      {SECOES_TERMOS.map((secao) => (
        <section key={secao.id} id={secao.id} className="cartao termos-secao">
          <h2 className="cartao-titulo">{secao.titulo}</h2>
          {secao.paragrafos.map((paragrafo) => (
            <p key={paragrafo} className="termos-texto">
              {paragrafo}
            </p>
          ))}
        </section>
      ))}

      <p className="termos-rodape">
        Dúvidas sobre estes termos ou sobre seus dados? Use o canal de contato do projeto.
      </p>
    </div>
  )
}
