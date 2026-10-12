import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button'
import { Input, TextArea } from '../../shared/ui/Input'
import { CalendarioMulti } from '../../shared/ui/CalendarioMulti'
import type { Item } from '../../db/schema'
import type { EntradaItem } from './items.repo'

export interface ItemFormProps {
  item?: Item
  aoCancelar: () => void
  aoSalvar: (entrada: EntradaItem) => Promise<void>
}

const LIMITE_TITULO = 120
const LIMITE_DESCRICAO = 2000

/** Entende "17", "1705", "17:20", "17h20" e devolve HH:mm (ou null). */
function normalizarHora(bruto: string): string | null {
  const digitos = bruto.trim().replace(/\D/g, '')
  if (digitos.length === 0 || digitos.length > 4) return null
  let hora: number
  let minuto: number
  if (digitos.length === 4) {
    hora = Number(digitos.slice(0, 2))
    minuto = Number(digitos.slice(2))
  } else if (digitos.length === 3) {
    const duasCasas = Number(digitos.slice(0, 2))
    if (duasCasas <= 23) {
      hora = duasCasas
      minuto = Number(digitos.slice(2)) * 10
    } else {
      hora = Number(digitos.slice(0, 1))
      minuto = Number(digitos.slice(1))
    }
  } else {
    hora = Number(digitos)
    minuto = 0
  }
  if (hora > 23 || minuto > 59) return null
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
}

export function ItemForm({ item, aoCancelar, aoSalvar }: ItemFormProps) {
  const [titulo, setTitulo] = useState(item?.titulo ?? '')
  const [descricao, setDescricao] = useState(item?.descricao ?? '')
  const [dias, setDias] = useState<string[]>(item?.diasAgendamento ?? [])
  const [horaBruta, setHoraBruta] = useState(item?.horaAgendamento ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const idDias = useId()

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const tituloLimpo = titulo.trim()
    if (tituloLimpo === '') {
      setErro('Informe um título para o item.')
      return
    }
    if (tituloLimpo.length > LIMITE_TITULO) {
      setErro(`O título pode ter no máximo ${LIMITE_TITULO} caracteres.`)
      return
    }
    if (descricao.length > LIMITE_DESCRICAO) {
      setErro(`A descrição pode ter no máximo ${LIMITE_DESCRICAO} caracteres.`)
      return
    }
    const hora = normalizarHora(horaBruta)
    if (horaBruta.trim() !== '' && hora === null) {
      setErro('Informe um horário válido (ex.: 17:00).')
      return
    }
    if (hora !== null && dias.length === 0) {
      setErro('Escolha pelo menos um dia no calendário ou deixe o horário vazio.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await aoSalvar({
        titulo: tituloLimpo,
        descricao: descricao.trim(),
        diasAgendamento: dias.length > 0 ? [...dias].sort() : undefined,
        horaAgendamento: hora ?? undefined,
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={(evento) => void enviar(evento)} noValidate>
      <Input
        label="Título"
        value={titulo}
        onChange={(evento) => setTitulo(evento.target.value)}
        placeholder="Ex.: Comprar mantimentos"
        maxLength={LIMITE_TITULO}
        erro={erro ?? undefined}
        required
      />
      <TextArea
        label="Descrição"
        value={descricao}
        onChange={(evento) => setDescricao(evento.target.value)}
        placeholder="Detalhes opcionais (fica salvo só no seu dispositivo)"
        maxLength={LIMITE_DESCRICAO}
      />
      <div className="campo">
        <span className="campo-label" id={idDias}>
          Dias (pode marcar vários)
        </span>
        <CalendarioMulti valor={dias} aoSelecionar={setDias} rotuloId={idDias} />
      </div>
      <Input
        label="Horário (vale para todos os dias)"
        value={horaBruta}
        onChange={(evento) => setHoraBruta(evento.target.value)}
        onBlur={() => {
          const hora = normalizarHora(horaBruta)
          if (hora !== null) setHoraBruta(hora)
        }}
        placeholder="HH:mm (opcional)"
        inputMode="numeric"
        maxLength={5}
      />
      <div className="formulario-acoes">
        <Button variante="secundario" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
