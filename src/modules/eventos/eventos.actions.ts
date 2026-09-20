'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/modules/usuarios/usuarios.actions'

const MAX_TITLE = 200
const MAX_DESCRIPTION = 5000
const MAX_LOCATION_TEXT = 200
const MIN_REMINDER_OFFSET = 0
const MAX_REMINDER_OFFSET = 10080
const MAX_REMINDERS = 10

export interface DadosEvento {
  title: string
  description?: string | null
  startsAt: string
  endsAt?: string | null
  allDay: boolean
  dias?: string[] | null
  locationText?: string | null
  latitude?: number | null
  longitude?: number | null
  color?: string
  reminderOffsets?: number[]
}

const COR_PADRAO = '#3b82f6'

function validarCor(value: unknown): string {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    return COR_PADRAO
  }
  return value
}

function sanitize(value: string): string {
  return value.replace(/[<>]/g, '')
}

function parseDate(value: string): Date | null {
  if (typeof value !== 'string') return null
  const temFuso = /(?:[zZ]$)|(?:[+-]\d{2}:?\d{2}$)/.test(value.trim())
  if (!temFuso) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

function validarReminders(offsets: unknown): number[] {
  if (!Array.isArray(offsets)) return []
  const vistos = new Set<number>()
  const validos: number[] = []
  for (const offset of offsets) {
    const n = Number(offset)
    if (
      Number.isInteger(n) &&
      n >= MIN_REMINDER_OFFSET &&
      n <= MAX_REMINDER_OFFSET &&
      !vistos.has(n)
    ) {
      vistos.add(n)
      validos.push(n)
    }
    if (validos.length >= MAX_REMINDERS) break
  }
  return validos.sort((a, b) => a - b)
}

function validarDias(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const chaves = value.filter(
    (c): c is string => typeof c === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c)
  )
  if (chaves.length === 0) return null
  return [...new Set(chaves)].sort()
}

interface DadosValidados {
  title: string
  description: string | null
  startsAt: Date
  endsAt: Date | null
  allDay: boolean
  dias: string[] | null
  locationText: string | null
  latitude: number | null
  longitude: number | null
  color: string
  reminderOffsets: number[]
}

type ResultadoValidacao =
  | { ok: true; data: DadosValidados }
  | { ok: false; error: string }

function validarDados(dados: DadosEvento): ResultadoValidacao {
  const title = sanitize(dados.title ?? '').trim()
  if (!title) return { ok: false, error: 'Título é obrigatório' }
  if (title.length > MAX_TITLE) return { ok: false, error: `Título deve ter no máximo ${MAX_TITLE} caracteres` }

  const description = sanitize(dados.description ?? '').trim().slice(0, MAX_DESCRIPTION) || null
  const locationText = sanitize(dados.locationText ?? '').trim().slice(0, MAX_LOCATION_TEXT) || null

  const startsAt = parseDate(dados.startsAt)
  if (!startsAt) return { ok: false, error: 'Data/hora de início inválida' }

  let endsAt: Date | null = null
  if (dados.endsAt) {
    endsAt = parseDate(dados.endsAt)
    if (!endsAt) return { ok: false, error: 'Data/hora final inválida' }
    if (endsAt.getTime() <= startsAt.getTime()) {
      return { ok: false, error: 'O fim deve ser depois do início' }
    }
  }

  const latitude = dados.latitude ?? null
  const longitude = dados.longitude ?? null
  if (latitude != null && (latitude < -90 || latitude > 90)) return { ok: false, error: 'Latitude inválida' }
  if (longitude != null && (longitude < -180 || longitude > 180)) return { ok: false, error: 'Longitude inválida' }

  return {
    ok: true,
    data: {
      title,
      description,
      startsAt,
      endsAt,
      allDay: !!dados.allDay,
      dias: validarDias(dados.dias),
      locationText,
      latitude,
      longitude,
      color: validarCor(dados.color),
      reminderOffsets: validarReminders(dados.reminderOffsets),
    },
  }
}

function calcularReminders(startsAt: Date, offsets: number[]) {
  const agora = Date.now()
  return offsets
    .map((offset) => ({
      offsetMinutes: offset,
      notifyAt: new Date(startsAt.getTime() - offset * 60_000),
    }))
    .filter((r) => r.notifyAt.getTime() > agora)
}

export async function criarEvento(dados: DadosEvento) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Você precisa estar logado para criar uma nota' }

  const resultado = validarDados(dados)
  if (!resultado.ok) return { error: resultado.error }

  const { title, description, startsAt, endsAt, allDay, dias, locationText, latitude, longitude, color, reminderOffsets } = resultado.data
  const reminders = calcularReminders(startsAt, reminderOffsets)

  const evento = await prisma.event.create({
    data: {
      title,
      description,
      startsAt,
      endsAt,
      allDay,
      dias: dias ? (dias as Prisma.InputJsonValue) : Prisma.JsonNull,
      locationText,
      latitude,
      longitude,
      color,
      usuarioId: usuario.id,
      reminders: {
        create: reminders,
      },
    },
  })

  revalidatePath('/eventos')
  revalidatePath('/')
  return { id: evento.id }
}

export async function editarEvento(id: number, dados: DadosEvento) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Você precisa estar logado para editar uma nota' }

  const evento = await prisma.event.findUnique({ where: { id, usuarioId: usuario.id } })
  if (!evento) return { error: 'Nota não encontrada' }

  const resultado = validarDados(dados)
  if (!resultado.ok) return { error: resultado.error }

  const { title, description, startsAt, endsAt, allDay, dias, locationText, latitude, longitude, color, reminderOffsets } = resultado.data
  const reminders = calcularReminders(startsAt, reminderOffsets)

  await prisma.event.update({
    where: { id, usuarioId: usuario.id },
    data: {
      title,
      description,
      startsAt,
      endsAt,
      allDay,
      dias: dias ? (dias as Prisma.InputJsonValue) : Prisma.JsonNull,
      locationText,
      latitude,
      longitude,
      color,
      reminders: {
        deleteMany: {},
        create: reminders,
      },
    },
  })

  revalidatePath('/eventos')
  revalidatePath('/')
  revalidatePath(`/eventos/${id}`)
  redirect(`/eventos/${id}`)
}

export async function alternarConclusaoEvento(id: number, done: boolean) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Você precisa estar logado' }

  const evento = await prisma.event.findUnique({ where: { id, usuarioId: usuario.id } })
  if (!evento) return { error: 'Nota não encontrada' }

  await prisma.event.update({ where: { id, usuarioId: usuario.id }, data: { done } })
  revalidatePath('/eventos')
  revalidatePath('/')
  revalidatePath(`/eventos/${id}`)
  return { success: true }
}

export async function deletarEvento(id: number) {
  const usuario = await getUsuarioLogado()
  if (!usuario) return { error: 'Você precisa estar logado' }

  const evento = await prisma.event.findUnique({ where: { id, usuarioId: usuario.id } })
  if (!evento) return { error: 'Nota não encontrada' }

  await prisma.event.delete({ where: { id, usuarioId: usuario.id } })
  revalidatePath('/eventos')
  revalidatePath('/')
  return { success: true }
}