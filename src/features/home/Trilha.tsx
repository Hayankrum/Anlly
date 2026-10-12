import type { CSSProperties } from 'react'
import { TrilhaPasso } from './TrilhaPasso'
import type { Item } from '../../db/schema'

/** Distância vertical entre dois nós do caminho. */
const ALTURA_LINHA = 104
/** Âncora horizontal de cada nó, como fração da largura do contentor. */
const COLUNAS = [0.5, 0.24, 0.5, 0.76]

interface TrilhaProps {
  itens: Item[]
  aoAbrir: (item: Item) => void
  aoConcluir: (item: Item) => void
}

interface Ponto {
  x: number
  y: number
}

/** Curvas em S suaves entre âncoras, para o caminho ondular como um mapa. */
function construirCaminho(pontos: Ponto[]): string {
  if (pontos.length < 2) return ''
  let d = `M ${pontos[0].x} ${pontos[0].y}`
  for (let i = 1; i < pontos.length; i++) {
    const de = pontos[i - 1]
    const para = pontos[i]
    const dy = (para.y - de.y) * 0.55
    d += ` C ${de.x} ${de.y + dy}, ${para.x} ${para.y - dy}, ${para.x} ${para.y}`
  }
  return d
}

/**
 * Jornada estilo Duolingo: nós circulares pendurados num caminho ondulante
 * que se enche até ao ponto onde o utilizador chegou, terminando numa
 * meta de chegada.
 */
export function Trilha({ itens, aoAbrir, aoConcluir }: TrilhaProps) {
  const primeiroPendente = itens.findIndex((item) => !item.concluido)

  const ancoras: Ponto[] = itens.map((_, indice) => ({
    x: COLUNAS[indice % COLUNAS.length] * 100,
    y: indice * ALTURA_LINHA + ALTURA_LINHA / 2,
  }))
  const meta: Ponto = { x: 50, y: itens.length * ALTURA_LINHA + ALTURA_LINHA / 2 }
  const pontos = [...ancoras, meta]

  const estrada = construirCaminho(pontos)
  const alcancado = primeiroPendente === -1 ? pontos.length - 1 : primeiroPendente
  const percorrido = construirCaminho(pontos.slice(0, alcancado + 1))

  return (
    <div className="trilha-envoltorio">
      <svg
        className="trilha-estrada"
        viewBox={`0 0 100 ${pontos.length * ALTURA_LINHA}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="trilha-estrada-base" d={estrada} vectorEffect="non-scaling-stroke" />
        <path className="trilha-estrada-feita" d={percorrido} vectorEffect="non-scaling-stroke" />
      </svg>

      <ol
        className="trilha-caminho"
        aria-label="sua jornada"
        style={{ '--row': `${ALTURA_LINHA}px` } as CSSProperties}
      >
        {itens.map((item, indice) => (
          <TrilhaPasso
            key={item.id}
            item={item}
            x={COLUNAS[indice % COLUNAS.length]}
            proximo={indice === primeiroPendente}
            aoAbrir={aoAbrir}
            aoConcluir={aoConcluir}
          />
        ))}
        <TrilhaChegada alcancada={primeiroPendente === -1 && itens.length > 0} />
      </ol>
    </div>
  )
}

function TrilhaChegada({ alcancada }: { alcancada: boolean }) {
  return (
    <li
      className={`trilha-passo trilha-chegada${alcancada ? ' trilha-chegada--alcancada' : ''}`}
      style={{ '--x': 0.5 } as CSSProperties}
    >
      <span className="trilha-bolha trilha-bolha--direita">
        <span className="trilha-bolha-titulo">
          {alcancada ? 'Jornada concluída!' : 'Chegada'}
        </span>
        <span className="trilha-bolha-meta">
          {alcancada ? 'Você percorreu o caminho até o fim' : 'Conclua todos os passos'}
        </span>
      </span>
      <span className="trilha-toque trilha-toque--estatico" aria-hidden="true">
        <span className="trilha-no trilha-no--meta">
          <svg
            width={26}
            height={26}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5.5 21V4.2" />
            <path d="M5.5 4.8h11l-1.8 3.4 1.8 3.4h-11" />
          </svg>
        </span>
      </span>
    </li>
  )
}
