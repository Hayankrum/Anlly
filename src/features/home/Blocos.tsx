import { Check, Circle } from 'lucide-react'
import { tempoRelativo } from '../../shared/lib/date'
import type { Item } from '../../db/schema'
import { iconeDoItem } from '../items/icones'

interface BlocosProps {
  itens: Item[]
  aoAbrir: (item: Item) => void
  aoConcluir: (item: Item) => void
}

/** Linha secundária do bloco: horário e tipo do item. */
function metaDoBloco(item: Item): string {
  const partes: string[] = []
  if (item.horaAgendamento) partes.push(`às ${item.horaAgendamento}`)

  const tipo = item.tipo ?? 'padrao'
  if (tipo === 'lista' && item.subitens?.length) {
    const feitos = item.subitens.filter((subitem) => subitem.concluido).length
    partes.push(`Lista · ${feitos}/${item.subitens.length}`)
  } else if (tipo === 'cronometro') {
    partes.push('Cronômetro')
  } else if (tipo === 'kanban') {
    partes.push('Projeto')
  }

  if (partes.length === 0) {
    const descricao = item.descricao.trim()
    partes.push(descricao !== '' ? descricao : `criado ${tempoRelativo(item.criadoEm)}`)
  }
  return partes.join(' · ')
}

/** Vista em blocos: grade de cartões do dia, no estilo das tarefas do v0. */
export function Blocos({ itens, aoAbrir, aoConcluir }: BlocosProps) {
  return (
    <ul className="blocos-grade" aria-label="Itens de hoje em blocos">
      {itens.map((item) => {
        const Icone = iconeDoItem(item.icone, item.tipo)
        return (
          <li key={item.id} className={item.concluido ? 'bloco bloco--feito' : 'bloco'}>
            <button type="button" className="bloco-corpo" onClick={() => aoAbrir(item)}>
              <Icone className="bloco-icone-fundo" size={56} strokeWidth={1.6} aria-hidden="true" />
              <span className="bloco-titulo">{item.titulo}</span>
              <span className="bloco-subtitulo">{metaDoBloco(item)}</span>
            </button>
            <button
              type="button"
              className="bloco-check"
              aria-pressed={item.concluido}
              aria-label={
                item.tipo === 'lista'
                  ? `Ver subitens de ${item.titulo}`
                  : item.concluido
                    ? `Desfazer conclusão de ${item.titulo}`
                    : `Concluir ${item.titulo}`
              }
              onClick={() => (item.tipo === 'lista' ? aoAbrir(item) : aoConcluir(item))}
            >
              {item.concluido ? (
                <Check size={19} aria-hidden="true" />
              ) : (
                <Circle size={19} aria-hidden="true" />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
