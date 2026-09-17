'use client'

import Link from 'next/link'

function pegarPaginas(atual: number, total: number): (number | '...')[] {
  const conjunto = new Set<number>()
  conjunto.add(1)
  conjunto.add(total)
  conjunto.add(atual)
  conjunto.add(atual - 1)
  conjunto.add(atual + 1)

  const numeros = [...conjunto]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const resultado: (number | '...')[] = []
  let anterior = 0
  for (const n of numeros) {
    if (n - anterior > 1) resultado.push('...')
    resultado.push(n)
    anterior = n
  }
  return resultado
}

interface PaginacaoProps {
  pagina: number
  totalPaginas: number
  onChange?: (pagina: number) => void
  buildHref?: (pagina: number) => string
}

const numeroClasse = 'flex items-center justify-center text-sm w-8 h-8 rounded-lg transition-colors shrink-0'
const setaClasse = 'flex items-center justify-center text-sm px-3 py-1.5 rounded-lg transition-colors shrink-0'

export default function Paginacao({ pagina, totalPaginas, onChange, buildHref }: PaginacaoProps) {
  if (totalPaginas <= 1) return null

  const paginas = pegarPaginas(pagina, totalPaginas)
  const anteriorHabilitada = pagina > 1
  const proximaHabilitada = pagina < totalPaginas

  function seta(conteudo: string, habilitada: boolean, destino: number, rotulo: string) {
    const style = {
      backgroundColor: 'var(--btn-secondary-bg)',
      color: 'var(--text-primary)',
    }
    if (buildHref) {
      if (!habilitada) {
        return (
          <span key={rotulo} className={`${setaClasse} opacity-40`} aria-hidden="true">
            {conteudo}
          </span>
        )
      }
      return (
        <Link
          key={rotulo}
          href={buildHref(destino)}
          className={setaClasse}
          style={style}
          aria-label={rotulo}
        >
          {conteudo}
        </Link>
      )
    }
    return (
      <button
        key={rotulo}
        type="button"
        onClick={() => onChange?.(destino)}
        disabled={!habilitada}
        className={setaClasse}
        style={style}
        aria-label={rotulo}
      >
        {conteudo}
      </button>
    )
  }

  function numeroEl(p: number | '...', index: number) {
    if (p === '...') {
      return (
        <span key={`el-${index}`} className={`${numeroClasse}`} aria-hidden="true">
          …
        </span>
      )
    }

    const ativo = p === pagina
    const style = {
      backgroundColor: ativo ? 'var(--btn-primary-bg)' : 'transparent',
      color: ativo ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
    }

    if (buildHref) {
      return (
        <Link
          key={p}
          href={buildHref(p)}
          className={numeroClasse}
          style={style}
          aria-current={ativo ? 'page' : undefined}
          aria-label={`Ir para a página ${p}`}
        >
          {p}
        </Link>
      )
    }
    return (
      <button
        key={p}
        type="button"
        onClick={() => onChange?.(p)}
        disabled={ativo}
        className={numeroClasse}
        style={style}
        aria-current={ativo ? 'page' : undefined}
        aria-label={`Ir para a página ${p}`}
      >
        {p}
      </button>
    )
  }

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center flex-wrap gap-1.5 mt-6">
      {seta('← Anterior', anteriorHabilitada, pagina - 1, 'Ir para a página anterior')}
      {paginas.map((p, i) => numeroEl(p, i))}
      {seta('Próxima →', proximaHabilitada, pagina + 1, 'Ir para a próxima página')}
    </nav>
  )
}