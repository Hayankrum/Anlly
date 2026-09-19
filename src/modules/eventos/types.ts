export interface Reminder {
  id: number
  eventId: number
  offsetMinutes: number
  notifyAt: string
  sentAt: string | null
}

export interface Evento {
  id: number
  title: string
  description: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean
  locationText: string | null
  latitude: number | null
  longitude: number | null
  done: boolean
  createdAt: string
  updatedAt: string
  reminders: Reminder[]
}

export const LEMBRETES_RAPIDOS: { offset: number; label: string }[] = [
  { offset: 0, label: 'No horário' },
  { offset: 10, label: '10 min antes' },
  { offset: 60, label: '1 hora antes' },
  { offset: 1440, label: '1 dia antes' },
  { offset: 10080, label: '1 semana antes' },
]

export function formatarOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'No horário'
  if (offsetMinutes % 10080 === 0) {
    const semanas = offsetMinutes / 10080
    return semanas === 1 ? '1 semana antes' : `${semanas} semanas antes`
  }
  if (offsetMinutes % 1440 === 0) {
    const dias = offsetMinutes / 1440
    return dias === 1 ? '1 dia antes' : `${dias} dias antes`
  }
  if (offsetMinutes % 60 === 0) {
    const horas = offsetMinutes / 60
    return horas === 1 ? '1 hora antes' : `${horas} horas antes`
  }
  return `${offsetMinutes} min antes`
}