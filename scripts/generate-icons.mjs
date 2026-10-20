#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const pastaIcones = join(raiz, 'public', 'icons')
const origemLogo = join(raiz, 'public', 'logo.png')

const alvos = [
  { origem: origemLogo, destino: join(pastaIcones, 'logo-nav.png'), tamanho: 96 },
  { origem: origemLogo, destino: join(pastaIcones, 'icon-192.png'), tamanho: 192 },
  { origem: origemLogo, destino: join(pastaIcones, 'icon-512.png'), tamanho: 512 },
  {
    origem: origemLogo,
    destino: join(pastaIcones, 'icon-maskable-512.png'),
    tamanho: 512,
    // deixa margem para a área segura do ícone mascarável
    filtro: (tamanho) => `scale=${Math.round(tamanho * 0.75)}:${Math.round(tamanho * 0.75)},pad=${tamanho}:${tamanho}:(ow-iw)/2:(oh-ih)/2:color=0xF5C400`,
  },
  { origem: origemLogo, destino: join(raiz, 'public', 'apple-touch-icon.png'), tamanho: 180 },
  { origem: origemLogo, destino: join(raiz, 'public', 'favicon.png'), tamanho: 48 },
]

mkdirSync(pastaIcones, { recursive: true })

function converter(comando, argumentos) {
  execFileSync(comando, argumentos, { stdio: 'pipe' })
}

function tentarConversao(alvo) {
  const escala = alvo.filtro
    ? alvo.filtro(alvo.tamanho)
    : `scale=${alvo.tamanho}:${alvo.tamanho}`
  const tentativas = [
    () =>
      converter('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        alvo.origem,
        '-vf',
        escala,
        '-y',
        alvo.destino,
      ]),
    () => converter('magick', ['-background', 'none', alvo.origem, '-resize', `${alvo.tamanho}x${alvo.tamanho}`, alvo.destino]),
    () => converter('convert', ['-background', 'none', alvo.origem, '-resize', `${alvo.tamanho}x${alvo.tamanho}`, alvo.destino]),
  ]
  for (const tentativa of tentativas) {
    try {
      tentativa()
      if (existsSync(alvo.destino)) return true
    } catch {
      // tenta a próxima ferramenta
    }
  }
  return false
}

let falhas = 0
for (const alvo of alvos) {
  if (!existsSync(alvo.origem)) {
    console.error(`Origem ausente: ${alvo.origem}`)
    falhas += 1
    continue
  }
  if (tentarConversao(alvo)) {
    console.log(`OK  ${alvo.destino}`)
  } else {
    console.error(`FALHOU ${alvo.destino} (instale ffmpeg, ImageMagick ou Inkscape)`)
    falhas += 1
  }
}

if (falhas > 0) process.exit(1)
