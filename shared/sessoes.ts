import { z } from 'zod'

/**
 * Sessões ("dispositivos conectados") da conta.
 *
 * O better-auth grava uma linha por login com `userAgent` e `ipAddress`;
 * estes helpers resumem o userAgent em algo legível para a tela de perfil.
 */

export const tipoDispositivoSchema = z.enum([
  'celular',
  'tablet',
  'computador',
  'desconhecido',
])

export type TipoDispositivo = z.infer<typeof tipoDispositivoSchema>

export const sessaoDispositivoSchema = z.object({
  /** Id da sessão (não é o token — o token nunca sai do servidor/cookie). */
  id: z.string().min(1),
  navegador: z.string().min(1),
  sistema: z.string().min(1),
  tipo: tipoDispositivoSchema,
  /** Epoch ms do login. */
  conectadoEm: z.number(),
  /** true quando a sessão é a deste aparelho. */
  atual: z.boolean(),
})

export type SessaoDispositivo = z.infer<typeof sessaoDispositivoSchema>

export const listaDispositivosSchema = z.object({
  dispositivos: z.array(sessaoDispositivoSchema),
})

export type ListaDispositivos = z.infer<typeof listaDispositivosSchema>

export const revogarDispositivoSchema = z.object({
  id: z.string().min(1),
})

/** Ordem importa: Edge/Opera/Samsung contêm "Chrome" no userAgent. */
const NAVEGADORES: Array<[RegExp, string]> = [
  [/\bEdg[A-Za-z]*\//, 'Edge'],
  [/\bOPR\/|\bOpera\b/, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bFirefox\/|\bFxiOS\//, 'Firefox'],
  [/\bChrome\/|\bCriOS\//, 'Chrome'],
  [/\bVersion\/[\d.]+.*\bSafari\//, 'Safari'],
]

function navegadorDo(userAgent: string): string {
  for (const [padrao, nome] of NAVEGADORES) {
    if (padrao.test(userAgent)) return nome
  }
  return 'Navegador desconhecido'
}

function sistemaDo(userAgent: string): string {
  const android = /\bAndroid (\d+(?:\.\d+)*)/.exec(userAgent)
  if (android) return `Android ${android[1]}`
  const ios = /\b(?:CPU iPhone OS|CPU OS|iPhone OS) (\d+(?:[._]\d+)*)/.exec(userAgent)
  if (ios) return `iOS ${ios[1].replace(/_/g, '.')}`
  if (/\bWindows NT\b/.test(userAgent)) return 'Windows'
  const mac = /\bMac OS X (\d+[._]\d+(?:[._]\d+)*)/.exec(userAgent)
  if (mac) return `macOS ${mac[1].replace(/_/g, '.')}`
  if (/\bCrOS\b/.test(userAgent)) return 'ChromeOS'
  if (/\bLinux\b/.test(userAgent)) return 'Linux'
  return 'Sistema desconhecido'
}

function tipoDo(userAgent: string): TipoDispositivo {
  if (/\biPad\b|\bTablet\b/.test(userAgent)) return 'tablet'
  // Android sem "Mobile" no UA costuma ser tablet.
  if (/\bAndroid\b/.test(userAgent)) return /Mobile/.test(userAgent) ? 'celular' : 'tablet'
  if (/\biPhone\b|\biPod\b|\bMobile\b/.test(userAgent)) return 'celular'
  if (userAgent.trim() === '') return 'desconhecido'
  return 'computador'
}

/** Resume um userAgent em "Chrome · Android 14" com o tipo de aparelho. */
export function resumirUserAgent(userAgent: string | null | undefined): {
  navegador: string
  sistema: string
  tipo: TipoDispositivo
} {
  const ua = userAgent ?? ''
  return { navegador: navegadorDo(ua), sistema: sistemaDo(ua), tipo: tipoDo(ua) }
}
