import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Trash2 } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Input, TextArea } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { COLUNAS_KANBAN, ROTULOS_COLUNA, type ColunaKanban } from '@shared/schemas/item'
import type { Item } from '../../db/schema'
import * as itemsRepo from '../items/items.repo'
import { useCartoes } from '../items/useItems'
import { ColunaQuadro } from './ColunaQuadro'
import './quadro.css'

type Edicao =
  | { modo: 'criar'; coluna: ColunaKanban }
  | { modo: 'editar'; cartao: Item }

function ehColuna(id: string): id is `coluna:${ColunaKanban}` {
  return id.startsWith('coluna:')
}

function colunaDe(id: string): ColunaKanban | null {
  return ehColuna(id) ? (id.slice('coluna:'.length) as ColunaKanban) : null
}

function agruparPorColuna(itens: Item[]): Map<ColunaKanban, Item[]> {
  const mapa = new Map<ColunaKanban, Item[]>()
  for (const coluna of COLUNAS_KANBAN) mapa.set(coluna, [])
  for (const item of itens) {
    mapa.get(item.coluna ?? 'afazer')?.push(item)
  }
  return mapa
}

/** Coluna em que um cartão está hoje (id que não é de coluna). */
function colunaDoCartao(mapa: Map<ColunaKanban, Item[]>, idCartao: string): ColunaKanban | null {
  for (const [coluna, itens] of mapa) {
    if (itens.some((item) => item.id === idCartao)) return coluna
  }
  return null
}

interface QuadroProjetoProps {
  projetoId: string
  podeEditar: boolean
}

/** Quadro kanban embutido na página de detalhe do projeto. */
export function QuadroProjeto({ projetoId, podeEditar }: QuadroProjetoProps) {
  const { mostrar } = useToast()
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [cartaoExcluir, setCartaoExcluir] = useState<Item | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const cartoes = useCartoes(projetoId)

  // Distância de 8px evita que um toque vire arrasto no mobile.
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const porColuna = useMemo(() => agruparPorColuna(cartoes), [cartoes])

  function abrirCriacao(coluna: ColunaKanban) {
    setTitulo('')
    setDescricao('')
    setErro(null)
    setEdicao({ modo: 'criar', coluna })
  }

  function abrirEdicao(cartao: Item) {
    setTitulo(cartao.titulo)
    setDescricao(cartao.descricao)
    setErro(null)
    setEdicao({ modo: 'editar', cartao })
  }

  function avisarErro(erroCatch: unknown) {
    if (erroCatch instanceof ErroCotaExcedida) {
      mostrar(erroCatch.message, { tipo: 'erro', duracao: 10000 })
      return
    }
    mostrar('Não foi possível completar a operação', { tipo: 'erro' })
  }

  async function aoTerminarArrasto(evento: DragEndEvent) {
    if (!podeEditar) return
    const { active, over } = evento
    if (!over) return

    const id = String(active.id)
    const alvo = String(over.id)
    // Queda sobre a coluna: entra no fim dela. Sobre outro cartão: a coluna é
    // a daquele cartão. Qualquer outra coisa, ignora (volta ao lugar).
    const colunaAlvo = ehColuna(alvo) ? colunaDe(alvo) : colunaDoCartao(porColuna, alvo)
    if (colunaAlvo === null) return

    const itensAlvo = porColuna.get(colunaAlvo) ?? []
    const indice = ehColuna(alvo)
      ? itensAlvo.length
      : Math.max(0, itensAlvo.findIndex((item) => item.id === alvo))

    try {
      await itemsRepo.moverParaColuna(id, colunaAlvo, indice)
    } catch (erroCatch) {
      avisarErro(erroCatch)
    }
  }

  async function alternar(item: Item) {
    if (!podeEditar) return
    try {
      await itemsRepo.alternarConcluido(item)
    } catch (erroCatch) {
      avisarErro(erroCatch)
    }
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const tituloLimpo = titulo.trim()
    if (tituloLimpo === '') {
      setErro('Informe um título para o cartão.')
      return
    }
    if (!podeEditar || edicao === null) return
    try {
      if (edicao.modo === 'criar') {
        await itemsRepo.criarCartao(projetoId, edicao.coluna, tituloLimpo, descricao.trim())
        mostrar(`Cartão criado em ${ROTULOS_COLUNA[edicao.coluna]}`, { tipo: 'sucesso' })
      } else {
        await itemsRepo.atualizarCartao(edicao.cartao.id, tituloLimpo, descricao.trim())
        mostrar('Cartão atualizado', { tipo: 'sucesso' })
      }
      setEdicao(null)
    } catch (erroCatch) {
      avisarErro(erroCatch)
    }
  }

  async function confirmarExclusao() {
    if (!podeEditar || !cartaoExcluir) return
    try {
      await itemsRepo.excluir(cartaoExcluir.id)
      setCartaoExcluir(null)
      mostrar('Cartão excluído', { tipo: 'info' })
    } catch (erroCatch) {
      avisarErro(erroCatch)
    }
  }

  return (
    <>
      <DndContext
        sensors={sensores}
        collisionDetection={closestCorners}
        onDragEnd={(evento) => void aoTerminarArrasto(evento)}
      >
        <div className="quadro">
          {COLUNAS_KANBAN.map((coluna) => (
            <ColunaQuadro
              key={coluna}
              coluna={coluna}
              itens={porColuna.get(coluna) ?? []}
              podeEditar={podeEditar}
              aoAbrir={abrirEdicao}
              aoAlternar={(item) => void alternar(item)}
              aoCriar={(c) => abrirCriacao(c)}
            />
          ))}
        </div>
      </DndContext>

      {edicao ? (
        <Modal
          aberto
          titulo={edicao.modo === 'criar' ? 'Novo cartão' : 'Editar cartão'}
          onFechar={() => setEdicao(null)}
          largura="estreito"
        >
          <form onSubmit={(evento) => void salvar(evento)} noValidate>
            <Input
              label="Título"
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              placeholder="Ex.: Definir escopo"
              maxLength={120}
              erro={erro ?? undefined}
              required
            />
            <TextArea
              label="Descrição"
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              placeholder="Detalhes opcionais"
              maxLength={2000}
            />
            <div className="formulario-acoes">
              {edicao.modo === 'editar' ? (
                <Button
                  variante="perigo"
                  onClick={() => {
                    setCartaoExcluir(edicao.cartao)
                    setEdicao(null)
                  }}
                  disabled={false}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Excluir
                </Button>
              ) : null}
              <Button variante="secundario" onClick={() => setEdicao(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        aberto={cartaoExcluir !== null}
        titulo="Excluir cartão"
        mensagem={
          cartaoExcluir
            ? `O cartão "${cartaoExcluir.titulo}" será removido do quadro.`
            : ''
        }
        textoConfirmar="Excluir"
        perigo
        aoConfirmar={() => void confirmarExclusao()}
        aoCancelar={() => setCartaoExcluir(null)}
      />
    </>
  )
}
