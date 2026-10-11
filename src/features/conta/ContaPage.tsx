import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { useToast } from '../../shared/ui/Toast'
import { tempoRelativo } from '../../shared/lib/date'
import { pluralizar } from '../../shared/lib/texto'
import { solicitarPersistencia, verificarPersistencia } from '../../shared/lib/storage'
import { contarPendentes } from '../../db/outbox.repo'
import { pausarSync, sincronizarAgora } from '../../sync/syncEngine'
import { LIMITE_SENHA, criarConta, entrar, sair } from './conta.api'
import { aceitarTermos } from './termos.api'
import { soltarCampoFocado } from '../../shared/lib/dom'
import {
  conectar,
  desconectar,
  finalizarTransicaoDeConta,
  iniciarTransicaoDeConta,
  type ResultadoPreparacao,
} from './conta.repo'
import { DESCRICOES_FASE, iconeDaFase } from './sync-estado'
import { useSessao } from './useSessao'
import { useSyncStatus } from './useSyncStatus'
import { useLiveQuery } from 'dexie-react-hooks'
import './conta.css'

type ModoConta = 'entrar' | 'criar'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContaPage() {
  const { mostrar } = useToast()
  const sessao = useSessao()
  const status = useSyncStatus()
  const pendentes = useLiveQuery(() => contarPendentes(), [], 0)
  const [persistente, setPersistente] = useState<boolean | null>(null)

  useEffect(() => {
    let ativo = true
    void verificarPersistencia().then((valor) => {
      if (ativo) setPersistente(valor)
    })
    return () => {
      ativo = false
    }
  }, [pendentes])

  async function solicitarEspaco() {
    const concedido = await solicitarPersistencia()
    setPersistente(concedido)
    mostrar(
      concedido
        ? 'Espaço permanente garantido para o app'
        : 'O navegador não concedeu espaço permanente',
      { tipo: concedido ? 'sucesso' : 'info' },
    )
  }

  const [modo, setModo] = useState<ModoConta>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [verSenha, setVerSenha] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const emailLimpo = email.trim()
    if (!EMAIL_RE.test(emailLimpo)) {
      setErroForm('Informe um e-mail válido.')
      return
    }
    if (senha.length < LIMITE_SENHA) {
      setErroForm(`A senha precisa de pelo menos ${LIMITE_SENHA} caracteres.`)
      return
    }
    if (modo === 'criar' && !aceitouTermos) {
      setErroForm('Para criar a conta, aceite os Termos de uso e a Política de privacidade.')
      return
    }
    setErroForm(null)
    setEnviando(true)
    // Trava o sync antes do cookie mudar: sem isso um lote da conta antiga
    // poderia ser enviado com a sessão nova e o servidor adotaria os itens.
    const liberar = await pausarSync()
    let resultado: ResultadoPreparacao | null = null
    try {
      await iniciarTransicaoDeConta()
      const novaSessao =
        modo === 'criar'
          ? await criarConta({ email: emailLimpo, senha, nome })
          : await entrar({ email: emailLimpo, senha })
      if (modo === 'criar') {
        // Aceite registrado no servidor antes da primeira sincronização.
        // Se falhar, o pop-up de termos aparece na próxima abertura.
        try {
          await aceitarTermos()
        } catch {
          /* vira pendência para o pop-up */
        }
      }
      resultado = await conectar(novaSessao)
      // O formulário vai desmontar com o campo ainda focado; sem isto o
      // teclado/barra de autocompletar do celular fica presa na tela.
      soltarCampoFocado()
      setSenha('')
      setVerSenha(false)
    } catch (erro) {
      setErroForm(erro instanceof Error ? erro.message : 'Não foi possível completar a operação.')
    } finally {
      try {
        await finalizarTransicaoDeConta()
      } finally {
        // A trava precisa ser liberada mesmo se a limpeza falhar, senão o
        // sync desta aba fica pausado para sempre.
        liberar()
        setEnviando(false)
      }
    }
    await sincronizarAgora()
    if (resultado !== null) {
      mostrar(
        resultado === 'conta-alterada'
          ? 'Conectado. Os dados da conta anterior foram apagados deste aparelho.'
          : 'Conta conectada. Sincronizando seus itens…',
        { tipo: 'sucesso' },
      )
    }
  }

  async function aoSair() {
    setSaindo(true)
    const liberar = await pausarSync()
    try {
      await iniciarTransicaoDeConta()
      await sair()
      await desconectar()
      soltarCampoFocado()
      mostrar('Desconectado. Seus itens continuam salvos neste aparelho — entre de novo para vê-los.', {
        tipo: 'info',
      })
    } catch {
      mostrar('Não foi possível sair da conta', { tipo: 'erro' })
    } finally {
      try {
        await finalizarTransicaoDeConta()
      } finally {
        liberar()
        setSaindo(false)
      }
    }
    await sincronizarAgora()
  }

  if (sessao === null) {
    return (
      <div className="pagina">
        <div className="pagina-cabecalho">
          <div>
            <h1 className="pagina-titulo">Conta</h1>
            <p className="pagina-subtitulo">
              Entre ou crie uma conta para ver e criar seus itens.
            </p>
          </div>
        </div>

        <section className="cartao" aria-labelledby="titulo-formulario">
          <h2 className="cartao-titulo" id="titulo-formulario">
            {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </h2>
          <div className="segmentado" role="group" aria-label="Modo da conta">
            <button type="button" aria-pressed={modo === 'entrar'} onClick={() => setModo('entrar')}>
              Entrar
            </button>
            <button type="button" aria-pressed={modo === 'criar'} onClick={() => setModo('criar')}>
              Criar conta
            </button>
          </div>
          <form className="conta-formulario" onSubmit={(evento) => void enviar(evento)} noValidate>
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
            />
            <Input
              label="Senha"
              type={verSenha ? 'text' : 'password'}
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
              minLength={LIMITE_SENHA}
              required
              sufixo={
                <button
                  type="button"
                  className="campo-sufixo"
                  onClick={() => setVerSenha((valor) => !valor)}
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={verSenha}
                  title={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            {modo === 'criar' ? (
              <Input
                label="Nome (opcional)"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                autoComplete="name"
                placeholder="Como devemos te chamar"
              />
            ) : null}
            {modo === 'criar' ? (
              <label className="conta-termos">
                <input
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={(evento) => setAceitouTermos(evento.target.checked)}
                  required
                />
                <span>
                  Li e aceito os{' '}
                  <Link to="/termos" target="_blank" rel="noopener noreferrer">
                    Termos de uso e a Política de privacidade
                  </Link>
                  .
                </span>
              </label>
            ) : null}
            {erroForm ? (
              <p className="conta-erro" role="alert">
                {erroForm}
              </p>
            ) : null}
            <Button type="submit" block disabled={enviando}>
              {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
        </section>

        <div className="aviso" role="status">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            Criar, editar e excluir itens só funciona com a conta conectada. Enquanto estiver
            fora, seus itens ficam guardados neste aparelho — ao entrar, tudo é enviado para a
            conta — inclusive o que foi feito offline. Entrar com{' '}
            <strong>outra conta</strong> apaga os dados locais para não misturar contas.
          </span>
        </div>
      </div>
    )
  }

  const descricao = DESCRICOES_FASE[status.fase]
  const IconeFase = iconeDaFase(status.fase)

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <div>
          <h1 className="pagina-titulo">Conta</h1>
          <p className="pagina-subtitulo">Sincronização em segundo plano com a nuvem.</p>
        </div>
      </div>

      <section className="cartao" aria-labelledby="titulo-sua-conta">
        <h2 className="cartao-titulo" id="titulo-sua-conta">
          Sua conta
        </h2>
        <p className="conta-email">{sessao.email}</p>
        {sessao.nome ? <p className="pagina-subtitulo">{sessao.nome}</p> : null}
        <div className="conta-acoes">
          <Button variante="secundario" onClick={() => void aoSair()} disabled={saindo}>
            <LogOut size={16} aria-hidden="true" />
            {saindo ? 'Saindo…' : 'Sair da conta'}
          </Button>
        </div>
      </section>

      <section className="cartao" aria-labelledby="titulo-sincronizacao">
        <h2 className="cartao-titulo" id="titulo-sincronizacao">
          Sincronização
        </h2>
        <p className={`conta-status conta-status--${descricao.tom}`} role="status">
          <IconeFase
            size={18}
            aria-hidden="true"
            className={descricao.girando ? 'conta-status-icone conta-status-icone--girando' : 'conta-status-icone'}
          />
          <strong>{descricao.rotulo}</strong>
        </p>
        <p className="pagina-subtitulo">{descricao.texto}</p>
        {status.fase === 'erro' && status.ultimoErro ? (
          <p className="conta-erro" role="alert">
            {status.ultimoErro}
          </p>
        ) : null}
        {status.rejeitadas > 0 && status.fase !== 'erro' ? (
          <p className="conta-erro" role="alert">
            {pluralizar(status.rejeitadas, 'alteração foi rejeitada', 'alterações foram rejeitadas')}{' '}
            pelo servidor e saiu da fila de envio. Os itens continuam neste aparelho — edite-os de
            novo para reenviar.
          </p>
        ) : null}
        {pendentes > 0 && persistente === false ? (
          <p className="conta-erro" role="alert">
            {pluralizar(pendentes, 'alteração ainda não foi para a nuvem', 'alterações ainda não foram para a nuvem')}{' '}
            e o espaço deste app não está garantido: se o navegador liberar memória, o que não
            subiu pode ser apagado deste aparelho.{' '}
            <button type="button" className="conta-erro-acao" onClick={() => void solicitarEspaco()}>
              Garantir espaço permanente
            </button>
          </p>
        ) : null}
        <p className="pagina-subtitulo conta-detalhes">
          {pluralizar(pendentes, 'alteração aguardando envio', 'alterações aguardando envio')}
          {' · '}
          última sincronização:{' '}
          {status.ultimaSincronizacao === null ? 'nunca' : tempoRelativo(status.ultimaSincronizacao)}
          {status.proximaTentativaEm !== null
            ? ` · próxima tentativa automática ${tempoRelativo(status.proximaTentativaEm)}`
            : ''}
        </p>
        <div className="conta-acoes">
          <Button
            variante="primario"
            onClick={() => void sincronizarAgora()}
            disabled={status.fase === 'sincronizando'}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {status.fase === 'sincronizando' ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>
        </div>
      </section>

      <section className="cartao" aria-labelledby="titulo-como-funciona">
        <h2 className="cartao-titulo" id="titulo-como-funciona">
          Como funciona
        </h2>
        <p className="pagina-subtitulo">
          O app continua offline: tudo é salvo primeiro neste aparelho. Com a conta conectada,
          você cria e edita itens e o sync envia suas alterações em segundo plano, baixando o que
          mudou em outros aparelhos. Sem conta, os itens ficam guardados aqui e voltam a aparecer
          quando você entrar de novo.
        </p>
      </section>
    </div>
  )
}
