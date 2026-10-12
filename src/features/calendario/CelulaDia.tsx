interface CelulaDiaProps {
  data: string
  numeroDia: number
  ehHoje: boolean
  ehSelecionado: boolean
  temItens: boolean
  aoSelecionar: (data: string) => void
}

export function CelulaDia({
  data,
  numeroDia,
  ehHoje,
  ehSelecionado,
  temItens,
  aoSelecionar,
}: CelulaDiaProps) {
  const classes = ['day-cell']
  if (ehHoje) classes.push('is-today')
  if (ehSelecionado) classes.push('is-selected')
  if (temItens) classes.push('has-events')

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={() => aoSelecionar(data)}
      aria-pressed={ehSelecionado}
      aria-label={`dia ${numeroDia}`}
    >
      <span className="day-number">{numeroDia}</span>
      <span className="day-dot" aria-hidden="true" />
    </button>
  )
}
