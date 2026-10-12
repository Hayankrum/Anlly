import type { CSSProperties } from 'react'
import { ListTodo } from 'lucide-react'
import { useSegurarParaConcluir } from '../../shared/lib/useSegurarParaConcluir'
import { tempoRelativo } from '../../shared/lib/date'
import type { Item } from '../../db/schema'

interface TrilhaPassoProps {
  item: Item
  /** Âncora horizontal do nó, como fração da largura do contentor. */
  x: number
  /** Nó que o utilizador deve encarar a seguir. */
  proximo: boolean
  aoAbrir: (item: Item) => void
  aoConcluir: (item: Item) => void
}

function metaDoItem(item: Item): string {
  const descricao = item.descricao.trim()
  if (descricao !== '') return descricao
  return `criado ${tempoRelativo(item.criadoEm)}`
}

/** Uma paragem circular da jornada mais a sua etiqueta flutuante. */
export function TrilhaPasso({ item, x, proximo, aoAbrir, aoConcluir }: TrilhaPassoProps) {
  const concluido = item.concluido

  const { progresso, segurando, propsSegurar } = useSegurarParaConcluir({
    aoConcluir: () => aoConcluir(item),
    aoTocar: () => aoAbrir(item),
  })

  const classes = ['trilha-passo']
  if (concluido) classes.push('trilha-passo--feito')
  if (proximo) classes.push('trilha-passo--proximo')
  if (segurando) classes.push('trilha-passo--segurando')

  const lado = x > 0.5 ? 'trilha-bolha--esquerda' : 'trilha-bolha--direita'

  const rotuloAcessivel = [
    item.titulo,
    metaDoItem(item),
    concluido ? 'concluído' : 'pendente',
    concluido ? 'segure para desfazer a conclusão' : 'toque para ver detalhes, segure 3s para concluir',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <li className={classes.join(' ')} style={{ '--x': x, '--hold': progresso } as CSSProperties}>
      <button type="button" className={`trilha-bolha ${lado}`} onClick={() => aoAbrir(item)}>
        <span className="trilha-bolha-titulo">{item.titulo}</span>
        <span className="trilha-bolha-meta">{metaDoItem(item)}</span>
        {proximo && !concluido && <span className="trilha-bolha-band">A seguir</span>}
      </button>

      <button type="button" className="trilha-toque" aria-label={rotuloAcessivel} {...propsSegurar}>
        <span className="trilha-anel" aria-hidden="true" />
        <span className="trilha-no">
          {concluido ? (
            <svg
              viewBox="0 0 24 24"
              width={26}
              height={26}
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 13 4.5 4.5L19 7" />
            </svg>
          ) : (
            <ListTodo size={26} strokeWidth={1.9} aria-hidden="true" />
          )}
        </span>
      </button>
    </li>
  )
}
