import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../shared/ui/Button'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { usePodeEditar } from '../conta/usePodeEditar'
import type { FiltroItens, Item } from '../../db/schema'
import * as itemsRepo from './items.repo'
import type { EntradaItem } from './items.repo'
import { ItemForm } from './ItemForm'
import { ItemList } from './ItemList'
import { useItems } from './useItems'
import './items.css'

const ROTULOS_FILTRO: Record<FiltroItens, string> = {
  todos: 'Todos',
  pendentes: 'Pendentes',
  concluidos: 'Concluídos',
}

type Edicao = { modo: 'criar' } | { modo: 'editar'; item: Item }

export function ItemsPage() {
  const { mostrar } = useToast()
  const navigate = useNavigate()
  const podeEditar = usePodeEditar()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroItens>('todos')
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [itemExcluir, setItemExcluir] = useState<Item | null>(null)

  const itens = useItems({ busca, filtro })
  const filtrando = busca.trim() !== '' || filtro !== 'todos'

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
    if (!podeEditar) return
    try {
      if (edicao?.modo === 'editar') {
        await itemsRepo.atualizar(edicao.item.id, entrada)
        mostrar('Item atualizado', { tipo: 'sucesso' })
      } else {
        await itemsRepo.criar(entrada)
        mostrar('Item criado', { tipo: 'sucesso' })
      }
      setEdicao(null)
    } catch (erro) {
      avisarErro(erro)
    }
  }

  async function alternar(item: Item) {
    if (!podeEditar) return
    try {
      await itemsRepo.alternarConcluido(item)
    } catch (erro) {
      avisarErro(erro)
    }
  }

  async function confirmarExclusao() {
    if (!podeEditar || !itemExcluir) return
    try {
      await itemsRepo.excluir(itemExcluir.id)
      setItemExcluir(null)
      mostrar('Item excluído', { tipo: 'info' })
    } catch (erro) {
      avisarErro(erro)
    }
  }

  if (!podeEditar) {
    return (
      <div className="pagina">
        <div className="pagina-cabecalho">
          <div>
            <h1 className="pagina-titulo">Itens</h1>
            <p className="pagina-subtitulo">Entre na sua conta para ver e criar itens.</p>
          </div>
        </div>

        <div className="lista-vazia">
          <p className="lista-vazia-titulo">Sua lista está protegida</p>
          <p>
            Os itens deste aparelho só aparecem com uma conta conectada — nada é apagado ao sair.
          </p>
          <Link className="btn btn--primario" to="/conta">
            Entrar ou criar conta
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <div>
          <h1 className="pagina-titulo">Itens</h1>
          <p className="pagina-subtitulo">
            {itens.length === 1 ? '1 item listado' : `${itens.length} itens listados`}
          </p>
        </div>
        <Button tamanho="pequeno" onClick={() => setEdicao({ modo: 'criar' })}>
          <Plus size={16} aria-hidden="true" />
          Novo item
        </Button>
      </div>

      <div className="itens-toolbar">
        <div className="campo">
          <label className="campo-label" htmlFor="busca-itens">
            Buscar itens
          </label>
          <div className="busca">
            <Search className="busca-icone" size={18} aria-hidden="true" />
            <input
              id="busca-itens"
              className="campo-controle busca-input"
              type="search"
              placeholder="Título ou descrição"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </div>
        </div>

        <div className="segmentado" role="group" aria-label="Filtrar por situação">
          {(Object.keys(ROTULOS_FILTRO) as FiltroItens[]).map((valor) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
            >
              {ROTULOS_FILTRO[valor]}
            </button>
          ))}
        </div>
      </div>

      <ItemList
        itens={itens}
        filtrando={filtrando}
        podeEditar={podeEditar}
        aoAlternar={(item) => void alternar(item)}
        aoEditar={(item) => setEdicao({ modo: 'editar', item })}
        aoExcluir={(item) => setItemExcluir(item)}
        aoCriar={() => setEdicao({ modo: 'criar' })}
      />

      <Modal
        aberto={edicao !== null}
        titulo={edicao?.modo === 'editar' ? 'Editar item' : 'Novo item'}
        onFechar={() => setEdicao(null)}
        largura="estreito"
      >
        {edicao ? (
          <ItemForm
            item={edicao.modo === 'editar' ? edicao.item : undefined}
            aoCancelar={() => setEdicao(null)}
            aoSalvar={salvar}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        aberto={itemExcluir !== null}
        titulo="Excluir item"
        mensagem={
          itemExcluir
            ? `O item "${itemExcluir.titulo}" será removido da lista. Esta ação não pode ser desfeita.`
            : ''
        }
        textoConfirmar="Excluir"
        perigo
        aoConfirmar={() => void confirmarExclusao()}
        aoCancelar={() => setItemExcluir(null)}
      />
    </div>
  )
}
