import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Eye, EyeOff, Info, LogOut, RefreshCw, Settings, ShieldCheck, KeyRound } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { useToast } from '../../shared/ui/Toast'
import { tempoRelativo } from '../../shared/lib/date'
import { pluralizar } from '../../shared/lib/texto'
import { solicitarPersistencia, verificarPersistencia } from '../../shared/lib/storage'
import { contarPendentes } from '../../db/outbox.repo'
import { pausarSync, sincronizarAgora } from '../../sync/syncEngine'
import { LIMITE_SENHA, criarConta, entrar, sair, solicitarRedefinicao, trocarSenha } from './conta.api'
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
  const [esqueciSenha, setEsqueciSenha] = useState(false)
  const [emailEsqueci, setEmailEsqueci] = useState('')
  const [enviandoEsqueci, setEnviandoEsqueci] = useState(false)
  const [mostrarTrocarSenha, setMostrarTrocarSenha] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [erroTrocarSenha, setErroTrocarSenha] = useState<string | null>(null)
  const [enviandoTrocarSenha, setEnviandoTrocarSenha] = useState(false)
  const [verSenhaTrocar, setVerSenhaTrocar] = useState(false)

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
    if (modo === 'criar' && nome.trim() === '') {
      setErroForm('Informe seu nome.')
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

  async function solicitarEsqueciSenha() {
    const emailLimpo = emailEsqueci.trim()
    if (!EMAIL_RE.test(emailLimpo)) {
      mostrar('Informe um e-mail válido.', { tipo: 'erro' })
      return
    }
    setEnviandoEsqueci(true)
    try {
      await solicitarRedefinicao(emailLimpo)
      mostrar('Se o e-mail existir, você receberá um link de recuperação.', { tipo: 'sucesso' })
      setEsqueciSenha(false)
      setEmailEsqueci('')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'Não foi possível enviar o link.', { tipo: 'erro' })
    } finally {
      setEnviandoEsqueci(false)
    }
  }

  async function aoTrocarSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (senhaAtual.length < LIMITE_SENHA) {
      setErroTrocarSenha('Informe sua senha atual.')
      return
    }
    if (novaSenha.length < LIMITE_SENHA) {
      setErroTrocarSenha(`A nova senha precisa de pelo menos ${LIMITE_SENHA} caracteres.`)
      return
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErroTrocarSenha('As senhas não coincidem.')
      return
    }
    setErroTrocarSenha(null)
    setEnviandoTrocarSenha(true)
    try {
      await trocarSenha(senhaAtual, novaSenha)
      setMostrarTrocarSenha(false)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarNovaSenha('')
      mostrar('Senha alterada com sucesso.', { tipo: 'sucesso' })
    } catch (e) {
      setErroTrocarSenha(e instanceof Error ? e.message : 'Não foi possível alterar a senha.')
    } finally {
      setEnviandoTrocarSenha(false)
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
        <section className="cartao" aria-labelledby="titulo-formulario">
          <img
            className="conta-mascote"
            src={`${import.meta.env.BASE_URL}mascote.png`}
            alt=""
            aria-hidden="true"
          />
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
            {modo === 'entrar' ? (
              esqueciSenha ? (
                <div className="conta-esqueci">
                  <Input
                    label="E-mail para recuperação"
                    type="email"
                    value={emailEsqueci}
                    onChange={(evento) => setEmailEsqueci(evento.target.value)}
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    required
                  />
                  <div className="conta-esqueci-acoes">
                    <Button
                      type="button"
                      variante="primario"
                      onClick={() => void solicitarEsqueciSenha()}
                      disabled={enviandoEsqueci}
                    >
                      {enviandoEsqueci ? 'Enviando…' : 'Enviar link'}
                    </Button>
                    <Button
                      type="button"
                      variante="secundario"
                      onClick={() => setEsqueciSenha(false)}
                      disabled={enviandoEsqueci}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="conta-esqueci-botao"
                  onClick={() => setEsqueciSenha(true)}
                >
                  <KeyRound size={14} aria-hidden="true" />
                  Esqueci minha senha
                </button>
              )
            ) : null}
            {modo === 'criar' ? (
              <Input
                label="Nome"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                autoComplete="name"
                placeholder="Como devemos te chamar"
                required
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
            Com conta conectada você pode editar e sincronizar. Fora da conta, itens ficam neste
            aparelho. Ao entrar, o que foi feito offline é enviado. Entrar com{' '}
            <strong>outra conta</strong> apaga os dados locais para não misturar contas.
          </span>
        </div>

        <section className="cartao" aria-labelledby="titulo-outros">
          <h2 className="cartao-titulo" id="titulo-outros">
            Mais
          </h2>
          <nav className="conta-links" aria-label="Outras páginas">
            <Link className="conta-link" to="/config">
              <Settings size={18} aria-hidden="true" />
              <span>Ajustes</span>
              <ChevronRight size={16} aria-hidden="true" className="conta-link-seta" />
            </Link>
            <Link className="conta-link" to="/sobre">
              <Info size={18} aria-hidden="true" />
              <span>Sobre</span>
              <ChevronRight size={16} aria-hidden="true" className="conta-link-seta" />
            </Link>
          </nav>
        </section>
      </div>
    )
  }

  const descricao = DESCRICOES_FASE[status.fase]
  const IconeFase = iconeDaFase(status.fase)

  return (
    <div className="pagina">
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
          <Button
            variante="secundario"
            onClick={() => {
              setMostrarTrocarSenha((v) => !v)
              setErroTrocarSenha(null)
              setSenhaAtual('')
              setNovaSenha('')
              setConfirmarNovaSenha('')
            }}
          >
            <KeyRound size={16} aria-hidden="true" />
            {mostrarTrocarSenha ? 'Cancelar' : 'Trocar senha'}
          </Button>
        </div>
        {mostrarTrocarSenha ? (
          <form className="conta-formulario" onSubmit={(evento) => void aoTrocarSenha(evento)} noValidate>
            <Input
              label="Senha atual"
              type={verSenhaTrocar ? 'text' : 'password'}
              value={senhaAtual}
              onChange={(evento) => setSenhaAtual(evento.target.value)}
              autoComplete="current-password"
              minLength={LIMITE_SENHA}
              required
              sufixo={
                <button
                  type="button"
                  className="campo-sufixo"
                  onClick={() => setVerSenhaTrocar((v) => !v)}
                  aria-label={verSenhaTrocar ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={verSenhaTrocar}
                  title={verSenhaTrocar ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {verSenhaTrocar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <Input
              label="Nova senha"
              type={verSenhaTrocar ? 'text' : 'password'}
              value={novaSenha}
              onChange={(evento) => setNovaSenha(evento.target.value)}
              autoComplete="new-password"
              minLength={LIMITE_SENHA}
              required
              sufixo={
                <button
                  type="button"
                  className="campo-sufixo"
                  onClick={() => setVerSenhaTrocar((v) => !v)}
                  aria-label={verSenhaTrocar ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={verSenhaTrocar}
                  title={verSenhaTrocar ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {verSenhaTrocar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <Input
              label="Confirmar nova senha"
              type={verSenhaTrocar ? 'text' : 'password'}
              value={confirmarNovaSenha}
              onChange={(evento) => setConfirmarNovaSenha(evento.target.value)}
              autoComplete="new-password"
              minLength={LIMITE_SENHA}
              required
              sufixo={
                <button
                  type="button"
                  className="campo-sufixo"
                  onClick={() => setVerSenhaTrocar((v) => !v)}
                  aria-label={verSenhaTrocar ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={verSenhaTrocar}
                  title={verSenhaTrocar ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {verSenhaTrocar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            {erroTrocarSenha ? (
              <p className="conta-erro" role="alert">
                {erroTrocarSenha}
              </p>
            ) : null}
            <Button type="submit" block disabled={enviandoTrocarSenha}>
              {enviandoTrocarSenha ? 'Aguarde…' : 'Salvar nova senha'}
            </Button>
          </form>
        ) : null}
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

      <section className="cartao" aria-labelledby="titulo-outros">
        <h2 className="cartao-titulo" id="titulo-outros">
          Mais
        </h2>
        <nav className="conta-links" aria-label="Outras páginas">
          <Link className="conta-link" to="/config">
            <Settings size={18} aria-hidden="true" />
            <span>Ajustes</span>
            <ChevronRight size={16} aria-hidden="true" className="conta-link-seta" />
          </Link>
          <Link className="conta-link" to="/sobre">
            <Info size={18} aria-hidden="true" />
            <span>Sobre</span>
            <ChevronRight size={16} aria-hidden="true" className="conta-link-seta" />
          </Link>
        </nav>
      </section>
    </div>
  )
}
