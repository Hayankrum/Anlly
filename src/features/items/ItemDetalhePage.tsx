import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, Pause, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { formatarDataHora, formatarDataISO, formatarDuracao } from '../../shared/lib/date'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { useCronometro } from '../../shared/lib/useCronometro'
import { useSegurarParaConcluir } from '../../shared/lib/useSegurarParaConcluir'
import { usePodeEditar } from '../conta/usePodeEditar'
import { useSessao } from '../conta/useSessao'
import type { Item } from '../../db/schema'
import * as itemsRepo from './items.repo'
import type { EntradaItem } from './items.repo'
import { ItemForm } from './ItemForm'
import { useCartoes } from './useItems'
import { QuadroProjeto } from '../quadro/QuadroProjeto'
import './items.css'

interface LeituraItem {
  carregado: boolean
  item: Item | undefined
}

const LEITURA_INICIAL: LeituraItem = { carregado: false, item: undefined }

export function ItemDetalhePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { mostrar } = useToast()
  const podeEditar = usePodeEditar()
  const sessao = useSessao()
  const autor = sessao?.nome?.trim() || sessao?.email || null

  const [editando, setEditando] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false)
  const [confirmandoReset, setConfirmandoReset] = useState(false)

  const leitura = useLiveQuery(
    async (): Promise<LeituraItem> => ({
      carregado: true,
      item: await itemsRepo.obter(id),
    }),
    [id],
    LEITURA_INICIAL,
  )
  const item = leitura.item
  const ehCronometro = item?.tipo === 'cronometro'
  const ehKanban = item?.tipo === 'kanban' && item.parentId === undefined

  // Quadro do projeto: cartões vivem no detalhe (só projetos têm quadro).
  const cartoes = useCartoes(ehKanban ? item.id : '')
  const totalCartoes = cartoes.length
  const cartoesFeitos = cartoes.filter((cartao) => cartao.coluna === 'feito').length

  // Tica a cada segundo enquanto o cronômetro estiver rodando.
  const tempoMs = useCronometro(item?.tempoDecorridoMs, item?.timerIniciadoEm)
  const cronometroRodando = item?.timerIniciadoEm !== undefined

  async function alternar() {
    if (!podeEditar || !item) return
    try {
      await itemsRepo.alternarConcluido(item)
    } catch (erro) {
      avisarErro(erro)
    }
  }

  // Gesto "segure para concluir" — mecanismo padrão (tipo `padrao`).
  const { progresso, segurando, propsSegurar } = useSegurarParaConcluir({
    aoConcluir: () => void alternar(),
    aoTocar: (evento) => {
      // Toque curto com o dedo não conclui; clique de teclado (Enter/Espaço) conclui na hora.
      if (evento.detail === 0) void alternar()
    },
  })

  function avisarErro(erro: unknown) {
    if (erro instanceof ErroCotaExcedida) {
      mostrar(erro.message, {
        tipo: 'erro',
        duracao: 10000,
        acao: { rotulo: 'Ver armazenamento', aoClicar: () => navigate('/config') },
      })
      return
    }
    mostrar('Não foi possível completar a operação', { tipo: 'erro' })
  }

  async function salvar(entrada: EntradaItem) {
    if (!podeEditar || !item) return
    try {
      await itemsRepo.atualizar(item.id, entrada)
      setEditando(false)
      mostrar('Item atualizado', { tipo: 'sucesso' })
    } catch (erro) {
      avisarErro(erro)
    }
  }

  async function reabrir() {
    if (!podeEditar || !item) return
    try {
      await itemsRepo.alternarConcluido(item)
    } catch (erro) {
      avisarErro(erro)
    }
  }

  /** Projeto kanban: todos os cartões de Feito voltam pra A Fazer. */
  async function reabrirQuadro() {
    if (!podeEditar || !item) return
    try {
      await itemsRepo.reabrirQuadro(item.id)
      mostrar('Quadro reaberto', { tipo: 'info' })
    } catch (erro) {
      avisarErro(erro)
    }
  }

  async function acaoTimer(
    operacao: () => Promise<void>,
    feedback?: { mensagem: string; tipo: 'sucesso' | 'info' },
  ) {
    if (!podeEditar || !item) return
    try {
      await operacao()
      if (feedback) mostrar(feedback.mensagem, { tipo: feedback.tipo })
    } catch (erro) {
      avisarErro(erro)
    }
  }

  async function excluir() {
    if (!podeEditar || !item) return
    try {
      await itemsRepo.excluir(item.id)
      setConfirmandoExcluir(false)
      mostrar('Item excluído', { tipo: 'info' })
      navigate('/calendario')
    } catch (erro) {
      avisarErro(erro)
    }
  }

  async function confirmarReset() {
    if (!podeEditar || !item) return
    try {
      await itemsRepo.resetarTimer(item.id)
      setConfirmandoReset(false)
      mostrar('Cronômetro zerado', { tipo: 'info' })
    } catch (erro) {
      avisarErro(erro)
    }
  }

  if (!leitura.carregado) {
    return (
      <div className="pagina">
        <p className="pagina-subtitulo">Carregando…</p>
      </div>
    )
  }

  if (item === undefined || item.deletedAt !== undefined || !podeEditar) {
    return (
      <div className="pagina">
        <div className="pagina-cabecalho">
          <div>
            <h1 className="pagina-titulo">Item</h1>
          </div>
        </div>

        <div className="lista-vazia">
          <p className="lista-vazia-titulo">Item não encontrado</p>
          {podeEditar ? (
            <p>Ele pode ter sido excluído ou não existe mais neste aparelho.</p>
          ) : (
            <p>
              Este item só é exibido com uma conta conectada — ele continua salvo neste
              aparelho.
            </p>
          )}
          {podeEditar ? null : (
            <Link className="btn btn--primario" to="/conta">
              Entrar / Criar conta
            </Link>
          )}
          <Link className="btn btn--secundario" to="/calendario">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar para agenda
          </Link>
        </div>
      </div>
    )
  }

  const conteudoConcluido = (
    <>
      {ehCronometro && tempoMs > 0 ? (
        <p className="item-cronometro-tempo">
          {formatarDuracao(tempoMs)}
          <span className="item-cronometro-estado">Tempo dedicado</span>
        </p>
      ) : null}
      <button
        type="button"
        className="item-reabrir"
        aria-pressed="true"
        onClick={() => void reabrir()}
      >
        <RotateCcw size={18} aria-hidden="true" />
        Reabrir
      </button>
    </>
  )

  return (
    <div className="pagina">
      <div className="pagina-cabecalho pagina-cabecalho--detalhe">
        <div>
          <p className="pagina-subtitulo">
            <Link className="item-voltar" to="/calendario">
              <ArrowLeft size={14} aria-hidden="true" />
              Agenda
            </Link>
          </p>
          <h1 className="pagina-titulo">{item.titulo}</h1>
        </div>
        <div className="item-detalhe-acoes">
          <button
            type="button"
            className="item-detalhe-acao"
            aria-label={`Editar ${item.titulo}`}
            title="Editar"
            onClick={() => setEditando(true)}
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="item-detalhe-acao item-detalhe-acao--perigo"
            aria-label={`Excluir ${item.titulo}`}
            title="Excluir"
            onClick={() => setConfirmandoExcluir(true)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <section className="cartao item-detalhe" aria-label="Detalhes do item">
        {autor ? (
          <p className="item-autor">
            Publicado por <strong>{autor}</strong>
          </p>
        ) : null}
        <p className={`item-situacao${item.concluido ? ' item-situacao--ok' : ''}`}>
          {item.concluido ? 'Concluído' : 'Pendente'}
        </p>
        {ehKanban ? (
          <p className="item-agendado">
            Quadro · {cartoesFeitos} de {totalCartoes} cartões em Feito
          </p>
        ) : null}
        {item.diasAgendamento && item.diasAgendamento.length > 0 ? (
          <p className="item-agendado">
            Agendado para {item.diasAgendamento.map(formatarDataISO).join(', ')}
            {item.horaAgendamento ? ` às ${item.horaAgendamento}` : ''}
          </p>
        ) : null}
        <p className="item-detalhe-descricao">
          {item.descricao ? item.descricao : 'Sem descrição.'}
        </p>
        <p className="item-data">criado em {formatarDataHora(item.criadoEm)}</p>
        {item.updatedAt !== item.criadoEm ? (
          <p className="item-data">atualizado em {formatarDataHora(item.updatedAt)}</p>
        ) : null}
      </section>

      {ehKanban ? (
        <>
          {item.concluido ? (
            <button type="button" className="item-reabrir" onClick={() => void reabrirQuadro()}>
              <RotateCcw size={18} aria-hidden="true" />
              Reabrir quadro
            </button>
          ) : null}
          <QuadroProjeto projetoId={item.id} podeEditar={podeEditar} />
        </>
      ) : item.concluido ? (
        conteudoConcluido
      ) : ehCronometro ? (
        <div className="item-cronometro">
          <p className={`item-cronometro-tempo${cronometroRodando ? ' item-cronometro-tempo--rodando' : ''}`} aria-live="polite">
            {formatarDuracao(tempoMs)}
            <span className="item-cronometro-estado">
              {cronometroRodando ? 'em andamento' : tempoMs > 0 ? 'pausado' : 'pronto'}
            </span>
          </p>

          <div className="item-cronometro-acoes">
            {cronometroRodando ? (
              <>
                <button
                  type="button"
                  className="item-cronometro-btn item-cronometro-btn--pausar"
                  onClick={() => void acaoTimer(() => itemsRepo.pausarTimer(item.id))}
                >
                  <Pause size={18} aria-hidden="true" />
                  Pausar
                </button>
                <button
                  type="button"
                  className="item-cronometro-btn item-cronometro-btn--resetar"
                  onClick={() => setConfirmandoReset(true)}
                >
                  <RotateCcw size={18} aria-hidden="true" />
                  Zerar
                </button>
                <button
                  type="button"
                  className="item-cronometro-btn item-cronometro-btn--finalizar"
                  onClick={() =>
                    void acaoTimer(() => itemsRepo.finalizarTimer(item.id), {
                      mensagem: 'Item concluído',
                      tipo: 'sucesso',
                    })
                  }
                >
                  <Check size={18} aria-hidden="true" />
                  Finalizar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="item-cronometro-btn item-cronometro-btn--iniciar"
                  onClick={() => void acaoTimer(() => itemsRepo.iniciarTimer(item.id))}
                >
                  <Play size={18} aria-hidden="true" />
                  {tempoMs > 0 ? 'Continuar' : 'Iniciar'}
                </button>
                {tempoMs > 0 ? (
                  <>
                    <button
                      type="button"
                      className="item-cronometro-btn item-cronometro-btn--resetar"
                      onClick={() => setConfirmandoReset(true)}
                    >
                      <RotateCcw size={18} aria-hidden="true" />
                      Zerar
                    </button>
                    <button
                      type="button"
                      className="item-cronometro-btn item-cronometro-btn--finalizar"
                      onClick={() =>
                        void acaoTimer(() => itemsRepo.finalizarTimer(item.id), {
                          mensagem: 'Item concluído',
                          tipo: 'sucesso',
                        })
                      }
                    >
                      <Check size={18} aria-hidden="true" />
                      Finalizar
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`item-segurar${segurando ? ' item-segurar--segurando' : ''}`}
          style={{ '--hold': progresso } as CSSProperties}
          aria-label="Segure para concluir"
          {...propsSegurar}
        >
          <span className="item-segurar-preenchimento" aria-hidden="true" />
          <span className="item-segurar-rotulo">
            <Check size={18} aria-hidden="true" />
            {segurando ? 'Segure…' : 'Segure para concluir'}
          </span>
        </button>
      )}

      <Modal aberto={editando} titulo="Editar item" onFechar={() => setEditando(false)} largura="estreito">
        <ItemForm item={item} aoCancelar={() => setEditando(false)} aoSalvar={salvar} />
      </Modal>

      <ConfirmDialog
        aberto={confirmandoExcluir}
        titulo="Excluir item"
        mensagem={`O item "${item.titulo}" será removido da lista. Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        perigo
        aoConfirmar={() => void excluir()}
        aoCancelar={() => setConfirmandoExcluir(false)}
      />

      <ConfirmDialog
        aberto={confirmandoReset}
        titulo="Zerar cronômetro"
        mensagem={`O tempo de "${item.titulo}" será zerado. Esta ação não pode ser desfeita.`}
        textoConfirmar="Zerar"
        perigo
        aoConfirmar={() => void confirmarReset()}
        aoCancelar={() => setConfirmandoReset(false)}
      />
    </div>
  )
}
