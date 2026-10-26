import { useCallback, useEffect, useState } from 'react'
import { Globe, LogOut, Monitor, Smartphone, Tablet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { useToast } from '../../shared/ui/Toast'
import { tempoRelativo } from '../../shared/lib/date'
import type { SessaoDispositivo, TipoDispositivo } from '@shared/sessoes'
import { ErroRede } from '../../sync/api'
import { listarDispositivos, revogarDispositivo, revogarOutrosDispositivos } from './sessoes.api'

const ICONES_TIPO: Record<TipoDispositivo, LucideIcon> = {
  celular: Smartphone,
  tablet: Tablet,
  computador: Monitor,
  desconhecido: Globe,
}

interface DispositivosConectadosProps {
  /** Força a recarga quando a sessão desta aba muda. */
  chaveSessao: string
}

export function DispositivosConectados({ chaveSessao }: DispositivosConectadosProps) {
  const { mostrar } = useToast()
  const [dispositivos, setDispositivos] = useState<SessaoDispositivo[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [revogandoId, setRevogandoId] = useState<string | null>(null)
  const [confirmandoRevogar, setConfirmandoRevogar] = useState<SessaoDispositivo | null>(null)
  const [confirmandoOutros, setConfirmandoOutros] = useState(false)
  const [saindoOutros, setSaindoOutros] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const lista = await listarDispositivos()
      setDispositivos(lista?.dispositivos ?? [])
    } catch (e) {
      // Sem rede a seção não tem o que mostrar (a lista vive no servidor),
      // mas não é erro: o resto do app segue funcionando normalmente.
      setErro(
        e instanceof ErroRede
          ? 'Sem conexão agora. Os dispositivos aparecem quando a rede voltar.'
          : 'Não foi possível carregar os dispositivos conectados.',
      )
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void recarregar()
  }, [recarregar, chaveSessao])

  async function aoRevogar() {
    const alvo = confirmandoRevogar
    if (!alvo) return
    setRevogandoId(alvo.id)
    try {
      await revogarDispositivo(alvo.id)
      mostrar('Dispositivo desconectado', { tipo: 'info' })
      setConfirmandoRevogar(null)
      await recarregar()
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'Não foi possível desconectar o dispositivo', {
        tipo: 'erro',
      })
    } finally {
      setRevogandoId(null)
    }
  }

  async function aoRevogarOutros() {
    setSaindoOutros(true)
    try {
      const desconectados = await revogarOutrosDispositivos()
      mostrar(
        desconectados === 0
          ? 'Nenhum outro dispositivo estava conectado'
          : `${desconectados === 1 ? '1 dispositivo' : `${desconectados} dispositivos`} desconectado${desconectados === 1 ? '' : 's'}`,
        { tipo: 'info' },
      )
      setConfirmandoOutros(false)
      await recarregar()
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'Não foi possível desconectar os dispositivos', {
        tipo: 'erro',
      })
    } finally {
      setSaindoOutros(false)
    }
  }

  const outros = dispositivos?.filter((d) => !d.atual) ?? []

  return (
    <section className="cartao" aria-labelledby="titulo-dispositivos">
      <h2 className="cartao-titulo" id="titulo-dispositivos">
        Dispositivos conectados
      </h2>

      {erro ? (
        <p className="conta-erro" role="alert">
          {erro}{' '}
          <button type="button" className="conta-erro-acao" onClick={() => void recarregar()}>
            Tentar de novo
          </button>
        </p>
      ) : null}

      {carregando && dispositivos === null ? (
        <p className="pagina-subtitulo">Carregando…</p>
      ) : dispositivos !== null && dispositivos.length === 0 ? (
        <p className="pagina-subtitulo">Nenhum dispositivo conectado no momento.</p>
      ) : dispositivos !== null ? (
        <ul className="dispositivos-lista">
          {dispositivos.map((dispositivo) => {
            const Icone = ICONES_TIPO[dispositivo.tipo]
            return (
              <li key={dispositivo.id} className="dispositivo">
                <Icone size={20} aria-hidden="true" className="dispositivo-icone" />
                <div className="dispositivo-info">
                  <p className="dispositivo-nome">
                    {dispositivo.navegador} · {dispositivo.sistema}
                    {dispositivo.atual ? (
                      <span className="dispositivo-atual">Este aparelho</span>
                    ) : null}
                  </p>
                  <p className="dispositivo-detalhe">
                    conectado {tempoRelativo(dispositivo.conectadoEm)}
                  </p>
                </div>
                {dispositivo.atual ? null : (
                  <Button
                    variante="fantasma"
                    tamanho="pequeno"
                    aria-label={`Desconectar ${dispositivo.navegador} em ${dispositivo.sistema}`}
                    disabled={revogandoId === dispositivo.id}
                    onClick={() => setConfirmandoRevogar(dispositivo)}
                  >
                    <LogOut size={14} aria-hidden="true" />
                    {revogandoId === dispositivo.id ? 'Desconectando…' : 'Desconectar'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      {outros.length > 0 ? (
        <div className="dispositivos-acoes">
          <Button variante="secundario" disabled={saindoOutros} onClick={() => setConfirmandoOutros(true)}>
            <LogOut size={16} aria-hidden="true" />
            {saindoOutros ? 'Desconectando…' : 'Sair de todos os outros dispositivos'}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        aberto={confirmandoRevogar !== null}
        titulo="Desconectar dispositivo"
        mensagem={
          confirmandoRevogar
            ? `${confirmandoRevogar.navegador} em ${confirmandoRevogar.sistema} será desconectado da conta. Quem estiver usando precisará entrar de novo.`
            : ''
        }
        textoConfirmar="Desconectar"
        perigo
        aoConfirmar={() => void aoRevogar()}
        aoCancelar={() => setConfirmandoRevogar(null)}
      />

      <ConfirmDialog
        aberto={confirmandoOutros}
        titulo="Sair de todos os outros dispositivos"
        mensagem="Todos os outros dispositivos serão desconectados da conta. Este aparelho continua conectado."
        textoConfirmar="Desconectar todos"
        perigo
        aoConfirmar={() => void aoRevogarOutros()}
        aoCancelar={() => setConfirmandoOutros(false)}
      />
    </section>
  )
}
