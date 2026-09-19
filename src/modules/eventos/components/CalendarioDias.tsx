'use client'

import { useMemo, useState } from 'react'
import {
  dataParaInputDate,
  diasNoMes,
  inicioDoMes,
  nomeDiaSemanaCurto,
  nomeDoMes,
  somarDias,
  somarMeses,
} from '../dateUtils'

interface Props {
  dias: string[]
  color?: string
  onChange: (chave: string) => void
}

export default function CalendarioDias({ dias, color = '#3b82f6', onChange }: Props) {
  const [mes, setMes] = useState<Date>(() => {
    const base = dias.length ? new Date(`${dias[0]}T12:00`) : new Date()
    return inicioDoMes(base)
  })

  const { inicioGrade, totalCelulas } = useMemo(() => {
    const primeiro = inicioDoMes(mes)
    const deslocamento = primeiro.getDay()
    const celulas = Math.ceil((deslocamento + diasNoMes(mes)) / 7) * 7
    return { inicioGrade: somarDias(primeiro, -deslocamento), totalCelulas: celulas }
  }, [mes])

  const celulas = useMemo(() => {
    const lista: Date[] = []
    for (let i = 0; i < totalCelulas; i++) lista.push(somarDias(inicioGrade, i))
    return lista
  }, [inicioGrade, totalCelulas])

  const marcados = useMemo(() => new Set(dias), [dias])
  const hojeChave = dataParaInputDate(new Date())

  const botaoNav =
    'w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMes(somarMeses(mes, -1))}
          className={botaoNav}
          style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
          {nomeDoMes(mes.getMonth())} {mes.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setMes(somarMeses(mes, 1))}
          className={botaoNav}
          style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="text-center text-[11px] font-medium py-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {nomeDiaSemanaCurto(i)}
          </div>
        ))}
        {celulas.map((dia) => {
          const chave = dataParaInputDate(dia)
          const pertence = dia.getMonth() === mes.getMonth()
          const marcado = marcados.has(chave)
          const ehHoje = chave === hojeChave

          return (
            <button
              key={chave}
              type="button"
              onClick={() => onChange(chave)}
              className="h-9 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: marcado ? color : 'transparent',
                color: marcado ? '#ffffff' : 'var(--text-primary)',
                opacity: pertence ? 1 : 0.35,
                ...(marcado ? { boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)' } : {}),
              }}
              aria-label={`${marcado ? 'Desmarcar' : 'Marcar'} dia ${chave}`}
              aria-pressed={marcado}
            >
              <span
                className="w-6 h-6 mx-auto flex items-center justify-center rounded-full"
                style={{ border: ehHoje && !marcado ? '1px solid var(--text-primary)' : 'none' }}
              >
                {dia.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMes(inicioDoMes(new Date()))}
          className="text-xs transition-colors hover:underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Ir para hoje
        </button>
        {marcados.size > 0 && (
          <button
            type="button"
            onClick={() => marcados.forEach((c) => onChange(c))}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Limpar tudo
          </button>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        Clique nos dias para marcar ou desmarcar um a um.
      </p>
    </div>
  )
}