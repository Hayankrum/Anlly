import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { usePodeEditar } from '../conta/usePodeEditar'
import type { Item, PeriodoItens } from '../../db/schema'
import * as itemsRepo from './items.repo'
import type { EntradaItem } from './items.repo'
import { ItemForm } from './ItemForm'
import { ItemList } from './ItemList'
import { useItems, useItemsStats } from './useItems'
import './items.css'

const ROTULOS_PERIODO: Record<PeriodoItens, string> = {
  dia: 'Dia',
  semana: 'Semana',
  mes: 'Mês',
}

type Edicao = { modo: 'criar' } | { modo: 'editar'; item: Item }

export function ItemsPage() {
  const { mostrar } = useToast()
  const navigate = useNavigate()
  const podeEditar = usePodeEditar()
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState<PeriodoItens>('dia')
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [itemExcluir, setItemExcluir] = useState<Item | null>(null)

  const itens = useItems({ busca, periodo })
  const { total } = useItemsStats()

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
        <div className="lista-vazia">
          <p className="lista-vazia-titulo">Sua lista está protegida</p>
          <p>
            Os itens deste aparelho só aparecem com uma conta conectada — nada é apagado ao sair.
          </p>
          <Link className="btn btn--primario" to="/conta">
            Entrar / Criar conta
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pagina">
      <div className="itens-toolbar">
        <div className="campo">
          <div className="busca">
            <Search className="busca-icone" size={18} aria-hidden="true" />
            <input
              id="busca-itens"
              className="campo-controle busca-input"
              type="search"
              placeholder="Título ou descrição"
              aria-label="Buscar itens"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </div>
        </div>

        <div className="segmentado" role="group" aria-label="Filtrar por período">
          {(Object.keys(ROTULOS_PERIODO) as PeriodoItens[]).map((valor) => (
            <button
              key={valor}
              type="button"
              aria-pressed={periodo === valor}
              onClick={() => setPeriodo(valor)}
            >
              {ROTULOS_PERIODO[valor]}
            </button>
          ))}
        </div>
      </div>

      <ItemList
        itens={itens}
        temItens={total > 0}
        podeEditar={podeEditar}
        aoAlternar={(item) => void alternar(item)}
        aoEditar={(item) => setEdicao({ modo: 'editar', item })}
        aoExcluir={(item) => setItemExcluir(item)}
        aoCriar={() => setEdicao({ modo: 'criar' })}
      />

      {edicao === null ? (
        <button
          type="button"
          className="fab"
          aria-label="Novo item"
          onClick={() => setEdicao({ modo: 'criar' })}
        >
          <Plus size={26} aria-hidden="true" />
        </button>
      ) : null}

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
