import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'
import type { ColunaKanbanDetalhe } from '@shared/schemas/item'
import type { Item } from '../../db/schema'
import { CartaoQuadro } from './CartaoQuadro'

interface ColunaQuadroProps {
  coluna: ColunaKanbanDetalhe
  itens: Item[]
  podeEditar: boolean
  ehConclusao: boolean
  podeRemover: boolean
  aoAbrir: (item: Item) => void
  aoAlternar: (item: Item) => void
  aoCriar: (coluna: string) => void
  aoMarcarConclusao: (coluna: string) => void
  aoRemover: (coluna: string) => void
}

/** Uma coluna do quadro: zona de queda + lista ordenável dos cartões. */
export function ColunaQuadro({
  coluna,
  itens,
  podeEditar,
  ehConclusao,
  podeRemover,
  aoAbrir,
  aoAlternar,
  aoCriar,
  aoMarcarConclusao,
  aoRemover,
}: ColunaQuadroProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `coluna:${coluna.id}` })

  return (
    <section
      ref={setNodeRef}
      className={`quadro-coluna${isOver ? ' quadro-coluna--sobre' : ''}`}
      aria-labelledby={`coluna-${coluna.id}`}
    >
      <header className="quadro-coluna-cabecalho">
        <h2 className="quadro-coluna-titulo" id={`coluna-${coluna.id}`}>
          {coluna.titulo}
        </h2>
        {ehConclusao ? <span className="quadro-coluna-selo">Conclusão</span> : null}
        <span className="quadro-coluna-contagem" aria-label={`${itens.length} cartões`}>
          {itens.length}
        </span>
        {podeEditar ? (
          <div className="quadro-coluna-acoes">
            <button
              type="button"
              className={`quadro-coluna-acao${ehConclusao ? ' quadro-coluna-acao--ativa' : ''}`}
              aria-label={
                ehConclusao
                  ? `${coluna.titulo} é a coluna de conclusão`
                  : `Marcar ${coluna.titulo} como coluna de conclusão`
              }
              aria-pressed={ehConclusao}
              title={ehConclusao ? 'Coluna de conclusão' : 'Definir como conclusão'}
              onClick={() => aoMarcarConclusao(coluna.id)}
            >
              <CheckCircle2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="quadro-coluna-acao"
              aria-label={`Adicionar cartão em ${coluna.titulo}`}
              title="Adicionar cartão"
              onClick={() => aoCriar(coluna.id)}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="quadro-coluna-acao quadro-coluna-acao--perigo"
              aria-label={`Remover coluna ${coluna.titulo}`}
              title="Remover coluna"
              disabled={!podeRemover}
              onClick={() => aoRemover(coluna.id)}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </header>

      <div className="quadro-coluna-corpo">
        <SortableContext items={itens.map((item) => item.id)} strategy={rectSortingStrategy}>
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
          <p className="quadro-coluna-vazia">Arraste um cartão aqui</p>
        ) : null}
      </div>
    </section>
  )
}
