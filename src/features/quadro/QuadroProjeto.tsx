import { useMemo, useState, type CSSProperties } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Input, TextArea } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import {
  obterQuadroKanban,
  type ColunaKanban,
  type Item as ItemCompartilhado,
} from '@shared/schemas/item'
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

const detectarColisao: CollisionDetection = (argumentos) => {
  const candidatos = argumentos.droppableContainers.filter(
    (container) => container.id !== argumentos.active.id,
  )
  const argumentosSemOrigem = { ...argumentos, droppableContainers: candidatos }
  const sobPonteiro = pointerWithin(argumentosSemOrigem)
  const cartaoAlvo = sobPonteiro.find(({ id }) => !ehColuna(String(id)))
  if (cartaoAlvo) return [cartaoAlvo]

  const colunaAlvo = sobPonteiro.find(({ id }) => ehColuna(String(id)))
  return colunaAlvo ? [colunaAlvo] : closestCorners(argumentosSemOrigem)
}

function agruparPorColuna(
  itens: Item[],
  colunas: { id: string; titulo: string }[],
): Map<ColunaKanban, Item[]> {
  const mapa = new Map<ColunaKanban, Item[]>()
  for (const coluna of colunas) mapa.set(coluna.id, [])
  for (const item of itens) {
    const colunaId = item.coluna ?? colunas[0]?.id
    const colunaItens = colunaId === undefined ? undefined : mapa.get(colunaId)
    if (colunaItens) colunaItens.push(item)
    else if (colunas[0]) mapa.get(colunas[0].id)?.push(item)
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
  config: ItemCompartilhado['quadroKanban']
}

/** Quadro kanban embutido na página de detalhe do projeto. */
export function QuadroProjeto({ projetoId, podeEditar, config }: QuadroProjetoProps) {
  const { mostrar } = useToast()
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [cartaoExcluir, setCartaoExcluir] = useState<Item | null>(null)
  const [colunaRemover, setColunaRemover] = useState<string | null>(null)
  const [adicionandoColuna, setAdicionandoColuna] = useState(false)
  const [tituloColuna, setTituloColuna] = useState('')
  const [erroColuna, setErroColuna] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const cartoes = useCartoes(projetoId)
  const quadro = obterQuadroKanban(config)
  const colunaRemoverConfig = quadro.colunas.find((coluna) => coluna.id === colunaRemover)

  // Distância de 8px evita que um toque vire arrasto no mobile.
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const porColuna = useMemo(
    () => agruparPorColuna(cartoes, quadro.colunas),
    [cartoes, quadro.colunas],
  )

  function abrirCriacao(coluna: string) {
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

  async function salvarNovaColuna(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nome = tituloColuna.trim()
    if (!nome) {
      setErroColuna('Informe um nome para a coluna.')
      return
    }
    if (!podeEditar) return
    try {
      await itemsRepo.adicionarColunaKanban(projetoId, nome)
      setAdicionandoColuna(false)
      setTituloColuna('')
      setErroColuna(null)
      mostrar('Coluna adicionada', { tipo: 'sucesso' })
    } catch (erroCatch) {
      avisarErro(erroCatch)
    }
  }

  async function marcarConclusao(colunaId: string) {
    if (!podeEditar) return
    try {
      await itemsRepo.marcarColunaConclusao(projetoId, colunaId)
      mostrar('Coluna de conclusão atualizada', { tipo: 'sucesso' })
    } catch (erroCatch) {
      avisarErro(erroCatch)
    }
  }

  async function removerColuna(destinoId: string) {
    if (!podeEditar || colunaRemover === null) return
    try {
      await itemsRepo.removerColunaKanban(projetoId, colunaRemover, destinoId)
      const destino = quadro.colunas.find((coluna) => coluna.id === destinoId)
      setColunaRemover(null)
      mostrar(
        colunaRemover === quadro.colunaConclusao
          ? `${destino?.titulo ?? 'Coluna'} agora é a coluna de conclusão`
          : 'Coluna removida e cartões movidos',
        { tipo: 'sucesso' },
      )
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
        const nomeColuna =
          quadro.colunas.find((coluna) => coluna.id === edicao.coluna)?.titulo ?? 'a coluna'
        mostrar(`Cartão criado em ${nomeColuna}`, { tipo: 'sucesso' })
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
        collisionDetection={detectarColisao}
        onDragEnd={(evento) => void aoTerminarArrasto(evento)}
      >
        <div className="quadro-projeto">
          <div
            className="quadro"
            style={{
              '--kanban-colunas': quadro.colunas.length + (podeEditar ? 1 : 0),
            } as CSSProperties}
          >
            {quadro.colunas.map((coluna) => (
              <ColunaQuadro
                key={coluna.id}
                coluna={coluna}
                itens={porColuna.get(coluna.id) ?? []}
                podeEditar={podeEditar}
                ehConclusao={coluna.id === quadro.colunaConclusao}
                podeRemover={quadro.colunas.length > 2}
                aoAbrir={abrirEdicao}
                aoAlternar={(item) => void alternar(item)}
                aoCriar={(c) => abrirCriacao(c)}
                aoMarcarConclusao={(id) => void marcarConclusao(id)}
                aoRemover={setColunaRemover}
              />
            ))}
            {podeEditar ? (
              <button
                type="button"
                className="quadro-coluna-cabecalho quadro-coluna-adicionar"
                onClick={() => {
                  setTituloColuna('')
                  setErroColuna(null)
                  setAdicionandoColuna(true)
                }}
                disabled={quadro.colunas.length >= 12}
              >
                <Plus size={16} aria-hidden="true" />
                <span>Adicionar coluna</span>
              </button>
            ) : null}
          </div>
        </div>
      </DndContext>

      <Modal
        aberto={adicionandoColuna}
        titulo="Adicionar coluna"
        onFechar={() => setAdicionandoColuna(false)}
        largura="estreito"
      >
        <form onSubmit={(evento) => void salvarNovaColuna(evento)} noValidate>
          <Input
            label="Nome da coluna"
            value={tituloColuna}
            onChange={(evento) => setTituloColuna(evento.target.value)}
            placeholder="Ex.: Em revisão"
            maxLength={40}
            erro={erroColuna ?? undefined}
            required
            autoFocus
          />
          <div className="formulario-acoes">
            <Button variante="secundario" onClick={() => setAdicionandoColuna(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        aberto={colunaRemoverConfig !== undefined}
        titulo={`Remover coluna ${colunaRemoverConfig?.titulo ?? ''}`}
        onFechar={() => setColunaRemover(null)}
        largura="estreito"
      >
        <div className="quadro-remover-coluna">
          <p>
            Os cartões desta coluna serão movidos para a coluna escolhida.
            {colunaRemover === quadro.colunaConclusao
              ? ' A coluna de destino também passará a ser a coluna de conclusão.'
              : ''}
          </p>
          {quadro.colunas
            .filter((coluna) => coluna.id !== colunaRemover)
            .map((coluna) => (
              <Button
                key={coluna.id}
                variante="secundario"
                onClick={() => void removerColuna(coluna.id)}
              >
                Mover para {coluna.titulo}
              </Button>
            ))}
        </div>
      </Modal>

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
