import { useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { ColunaKanban } from '@shared/schemas/item'
import { ROTULOS_COLUNA } from '@shared/schemas/item'
import type { Item } from '../../db/schema'
import { CartaoQuadro } from './CartaoQuadro'

interface ColunaQuadroProps {
  coluna: ColunaKanban
  itens: Item[]
  podeEditar: boolean
  aoAbrir: (item: Item) => void
  aoAlternar: (item: Item) => void
  aoCriar: (coluna: ColunaKanban) => void
}

function ehMobile(): boolean {
  return window.matchMedia('(max-width: 767px)').matches
}

/** Uma coluna do quadro: zona de queda + lista ordenável dos cartões. */
export function ColunaQuadro({
  coluna,
  itens,
  podeEditar,
  aoAbrir,
  aoAlternar,
  aoCriar,
}: ColunaQuadroProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `coluna:${coluna}` })
  const secaoRef = useRef<HTMLElement>(null)

  /** Atalho no mobile: tocar no espaço da coluna centraliza ela na tela. */
  function aoTocarFundo(evento: React.MouseEvent<HTMLElement>) {
    if (!ehMobile()) return
    // Só o fundo/cabeçalho — cliques em cartões ou botões seguem o caminho deles.
    const alvo = evento.target as HTMLElement
    if (alvo.closest('button, a, input, textarea')) return
    secaoRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  return (
    <section
      ref={secaoRef}
      className={`quadro-coluna${isOver ? ' quadro-coluna--sobre' : ''}`}
      aria-labelledby={`coluna-${coluna}`}
      onClick={(evento) => aoTocarFundo(evento)}
    >
      <header className="quadro-coluna-cabecalho">
        <h2 className="quadro-coluna-titulo" id={`coluna-${coluna}`}>
          {ROTULOS_COLUNA[coluna]}
        </h2>
        <span className="quadro-coluna-contagem" aria-label={`${itens.length} cartões`}>
          {itens.length}
        </span>
        {podeEditar ? (
          <button
            type="button"
            className="quadro-coluna-add"
            aria-label={`Novo cartão em ${ROTULOS_COLUNA[coluna]}`}
            onClick={() => aoCriar(coluna)}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div ref={setNodeRef} className="quadro-coluna-corpo">
        <SortableContext items={itens.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="quadro-coluna-lista">
            {itens.map((item) => (
              <CartaoQuadro
                key={item.id}
                item={item}
                podeEditar={podeEditar}
                aoAbrir={aoAbrir}
                aoAlternar={aoAlternar}
              />
            ))}
          </ul>
        </SortableContext>
        {itens.length === 0 ? (
          <p className="quadro-coluna-vazia">
            {coluna === 'afazer' ? 'Arraste um cartão aqui' : 'Arraste para esta coluna'}
          </p>
        ) : null}
      </div>
    </section>
  )
}
