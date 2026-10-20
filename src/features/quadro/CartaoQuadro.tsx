import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical } from 'lucide-react'
import type { Item } from '../../db/schema'

interface CartaoQuadroProps {
  item: Item
  podeEditar: boolean
  aoAbrir: (item: Item) => void
  aoAlternar: (item: Item) => void
}

/** Um cartão do quadro — arrastável pelo handle; clicar abre o modal de edição. */
export function CartaoQuadro({ item, podeEditar, aoAbrir, aoAlternar }: CartaoQuadroProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !podeEditar,
  })

  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={estilo}
      className={`quadro-cartao${isDragging ? ' quadro-cartao--arrastando' : ''}${
        item.concluido ? ' quadro-cartao--concluido' : ''
      }`}
    >
      <button
        type="button"
        className="quadro-cartao-pegar"
        aria-label={`Arrastar cartão ${item.titulo}`}
        disabled={!podeEditar}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="quadro-cartao-corpo"
        onClick={() => aoAbrir(item)}
        aria-label={`Editar cartão ${item.titulo}`}
      >
        <span className="quadro-cartao-titulo">{item.titulo}</span>
        {item.descricao ? <span className="quadro-cartao-descricao">{item.descricao}</span> : null}
      </button>

      <button
        type="button"
        className="quadro-cartao-check"
        role="checkbox"
        aria-checked={item.concluido}
        aria-label={
          item.concluido ? `Reabrir cartão ${item.titulo}` : `Concluir cartão ${item.titulo}`
        }
        disabled={!podeEditar}
        onClick={() => aoAlternar(item)}
      >
        <Check size={15} aria-hidden="true" />
      </button>
    </li>
  )
}
