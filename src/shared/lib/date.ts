const FORMATO_DATA: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}

const FORMATO_DATA_HORA: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

export function formatarData(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR', FORMATO_DATA)
}

export function formatarDataHora(timestamp: number): string {
  return new Date(timestamp).toLocaleString('pt-BR', FORMATO_DATA_HORA)
}

/** "2026-10-14" → "14/10/2026" (data civil em string, sem fuso). */
export function formatarDataISO(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

export function diasDesde(timestamp: number): number {
  const ms = Date.now() - timestamp
  return Math.floor(ms / 86_400_000)
}

const UNIDADES_RELATIVAS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 1_000],
  ['minute', 60_000],
  ['hour', 3_600_000],
  ['day', 86_400_000],
]

export function tempoRelativo(timestamp: number): string {
  const decorrido = timestamp - Date.now()
  const abs = Math.abs(decorrido)
  const formatador = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  let unidade: Intl.RelativeTimeFormatUnit = 'day'
  let escala = 86_400_000
  for (const [nome, ms] of UNIDADES_RELATIVAS) {
    if (abs < ms) {
      unidade = nome
      escala = ms
      break
    }
  }
  return formatador.format(Math.round(decorrido / escala), unidade)
}

export function formatarBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1)
  const valor = bytes / 1024 ** indice
  const casas = indice === 0 || valor >= 100 ? 0 : 1
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })} ${unidades[indice]}`
}
