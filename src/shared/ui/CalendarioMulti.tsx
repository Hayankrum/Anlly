import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const NOMES_MES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function dataLocalISO(agora: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`
}

function diasNoMes(ano: number, mes1: number): number {
  return new Date(Date.UTC(ano, mes1, 0)).getUTCDate()
}

/** Índice do weekday (0 = segunda) do dia 1 do mês. */
function inicioSemana(ano: number, mes1: number): number {
  const utc = new Date(Date.UTC(ano, mes1 - 1, 1)).getUTCDay()
  return (utc + 6) % 7
}

function formatarBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function proximoMes(ano: number, mes1: number, delta: number): { ano: number; mes1: number } {
  const idx = ano * 12 + (mes1 - 1) + delta
  return { ano: Math.floor(idx / 12), mes1: (idx % 12) + 1 }
}

export interface CalendarioMultiProps {
  /** Dias escolhidos (YYYY-MM-DD), em qualquer ordem. */
  valor: string[]
  aoSelecionar: (datas: string[]) => void
  rotuloId: string
}

/**
 * Calendário de seleção múltipla: cada clique marca/desmarca um dia
 * independente — nunca vira intervalo e pode cruzar meses.
 */
export function CalendarioMulti({ valor, aoSelecionar, rotuloId }: CalendarioMultiProps) {
  const hoje = dataLocalISO()
  const inicial = valor[0] ?? hoje
  const [anoInicial, mesInicial] = [
    Number(inicial.slice(0, 4)),
    Number(inicial.slice(5, 7)),
  ]
  const [vista, setVista] = useState(() => ({ ano: anoInicial, mes1: mesInicial }))

  const totalDias = diasNoMes(vista.ano, vista.mes1)
  const vazios = inicioSemana(vista.ano, vista.mes1)
  const celulas: (string | null)[] = [
    ...Array.from({ length: vazios }, () => null),
    ...Array.from(
      { length: totalDias },
      (_, i) =>
        `${vista.ano}-${String(vista.mes1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    ),
  ]

  const conjunto = new Set(valor)

  function alternar(iso: string) {
    if (conjunto.has(iso)) {
      aoSelecionar(valor.filter((d) => d !== iso))
    } else {
      aoSelecionar([...valor, iso].sort())
    }
  }

  return (
    <div className="calendario" role="group" aria-labelledby={rotuloId}>
      <div className="calendario-cabecalho">
        <button
          type="button"
          className="calendario-nav"
          aria-label="Mês anterior"
          onClick={() => setVista((v) => proximoMes(v.ano, v.mes1, -1))}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <span className="calendario-titulo" aria-live="polite">
          {NOMES_MES[vista.mes1 - 1]} {vista.ano}
        </span>
        <button
          type="button"
          className="calendario-nav"
          aria-label="Próximo mês"
          onClick={() => setVista((v) => proximoMes(v.ano, v.mes1, 1))}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="calendario-semana" aria-hidden="true">
        {DIAS_SEMANA.map((dia) => (
          <span key={dia} className="calendario-semana-dia">
            {dia}
          </span>
        ))}
      </div>

      <div className="calendario-grade">
        {celulas.map((iso, indice) => {
          if (iso === null) {
            return <span key={`vazio-${indice}`} className="calendario-dia calendario-dia--vazio" />
          }
          const dia = Number(iso.slice(8, 10))
          const selecionado = conjunto.has(iso)
          const passado = iso < hoje
          return (
            <button
              key={iso}
              type="button"
              className={[
                'calendario-dia',
                iso === hoje ? 'calendario-dia--hoje' : '',
                selecionado ? 'calendario-dia--selecionado' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={selecionado}
              aria-label={`${dia} de ${NOMES_MES[vista.mes1 - 1]}`}
              disabled={passado}
              onClick={() => alternar(iso)}
            >
              {dia}
            </button>
          )
        })}
      </div>

      <div className="calendario-rodape">
        <span className="calendario-resumo" aria-live="polite">
          {valor.length === 0
            ? 'Nenhum dia escolhido'
            : valor.length === 1
              ? `Dia ${formatarBR(valor[0])}`
              : `${valor.length} dias escolhidos (${valor.map(formatarBR).join(', ')})`}
        </span>
        {valor.length > 0 ? (
          <button type="button" className="calendario-limpar" onClick={() => aoSelecionar([])}>
            Limpar
          </button>
        ) : null}
      </div>
    </div>
  )
}
