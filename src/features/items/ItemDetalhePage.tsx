import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { formatarDataHora } from '../../shared/lib/date'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { usePodeEditar } from '../conta/usePodeEditar'
import { useSessao } from '../conta/useSessao'
import type { Item } from '../../db/schema'
import * as itemsRepo from './items.repo'
import type { EntradaItem } from './items.repo'
import { ItemForm } from './ItemForm'
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

  const leitura = useLiveQuery(
    async (): Promise<LeituraItem> => ({
      carregado: true,
      item: await itemsRepo.obter(id),
    }),
    [id],
    LEITURA_INICIAL,
  )
  const item = leitura.item

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

  async function alternar() {
    if (!podeEditar || !item) return
    try {
      await itemsRepo.alternarConcluido(item)
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
      navigate('/itens')
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
              Entrar ou criar conta
            </Link>
          )}
          <Link className="btn btn--secundario" to="/itens">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar para itens
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <div>
          <p className="pagina-subtitulo">
            <Link className="item-voltar" to="/itens">
              <ArrowLeft size={14} aria-hidden="true" />
              Itens
            </Link>
          </p>
          <h1 className="pagina-titulo">{item.titulo}</h1>
        </div>
        <div className="item-detalhe-acoes">
          <Button
            variante="secundario"
            tamanho="pequeno"
            onClick={() => void alternar()}
            aria-pressed={item.concluido}
          >
            <Check size={16} aria-hidden="true" />
            {item.concluido ? 'Reabrir' : 'Concluir'}
          </Button>
          <Button variante="secundario" tamanho="pequeno" onClick={() => setEditando(true)}>
            <Pencil size={16} aria-hidden="true" />
            Editar
          </Button>
          <Button
            variante="perigo"
            tamanho="pequeno"
            onClick={() => setConfirmandoExcluir(true)}
          >
            <Trash2 size={16} aria-hidden="true" />
            Excluir
          </Button>
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
        <p className="item-detalhe-descricao">
          {item.descricao ? item.descricao : 'Sem descrição.'}
        </p>
        <p className="item-data">criado em {formatarDataHora(item.criadoEm)}</p>
        {item.updatedAt !== item.criadoEm ? (
          <p className="item-data">atualizado em {formatarDataHora(item.updatedAt)}</p>
        ) : null}
      </section>

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
    </div>
  )
}
