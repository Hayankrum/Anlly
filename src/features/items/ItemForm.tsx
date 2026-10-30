import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button'
import { Input, TextArea } from '../../shared/ui/Input'
import { CalendarioMulti } from '../../shared/ui/CalendarioMulti'
import type { Item } from '../../db/schema'
import {
  QUADRO_KANBAN_PADRAO,
  LIMITE_DIAS_AGENDAMENTO,
  quadroKanbanSchema,
  repeticaoSchema,
  type RegraRepeticao,
  type TipoItem,
} from '@shared/schemas/item'
import { todayStr } from '../calendario/datas'
import { calcularProximasOcorrencias, rotuloRegraRepeticao } from './repeticao'
import type { EntradaItem } from './items.repo'
import { gerarId } from '../../shared/lib/id'
import type { AgendaModelo, EntradaModelo, Modelo } from '@shared/schemas/modelo'

export interface ItemFormProps {
  item?: Item
  modelo?: Modelo
  tipoInicial?: TipoItem
  dataInicial?: string
  agendaModoInicial?: 'hoje' | 'dias'
  aoCancelar: () => void
  aoSalvar: (entrada: EntradaItem) => Promise<boolean>
  aoSalvarModelo?: (modelo: EntradaModelo) => Promise<boolean>
}

type ModoAgenda = 'hoje' | 'dias' | 'repetir'
type Frequencia = RegraRepeticao['frequencia']

const LIMITE_TITULO = 120
const LIMITE_DESCRICAO = 2000
const DIAS_SEMANA = [
  { valor: 1, rotulo: 'Seg' },
  { valor: 2, rotulo: 'Ter' },
  { valor: 3, rotulo: 'Qua' },
  { valor: 4, rotulo: 'Qui' },
  { valor: 5, rotulo: 'Sex' },
  { valor: 6, rotulo: 'Sáb' },
  { valor: 0, rotulo: 'Dom' },
]

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

function dataCurta(data: string): string {
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).replace('.', '')
}

function tipoAgendaInicial(item: Item | undefined, hoje: string): ModoAgenda {
  if (item?.diasAgendamento?.length === 1 && item.diasAgendamento[0] === hoje) return 'hoje'
  return 'dias'
}

export function ItemForm({
  item,
  modelo,
  tipoInicial,
  dataInicial,
  agendaModoInicial,
  aoCancelar,
  aoSalvar,
  aoSalvarModelo,
}: ItemFormProps) {
  const hoje = todayStr()
  const [titulo, setTitulo] = useState(item?.titulo ?? modelo?.titulo ?? '')
  const [descricao, setDescricao] = useState(item?.descricao ?? modelo?.descricao ?? '')
  const tipo = item?.tipo ?? modelo?.tipo ?? tipoInicial ?? 'padrao'
  const [dias, setDias] = useState<string[]>(
    item?.diasAgendamento ??
      (modelo?.agenda.modo === 'dias' ? [] : dataInicial ? [dataInicial] : [hoje]),
  )
  const [modoAgenda, setModoAgenda] = useState<ModoAgenda>(
    agendaModoInicial ??
      (item
        ? tipoAgendaInicial(item, hoje)
        : modelo?.agenda.modo ?? (dataInicial ? 'dias' : 'hoje')),
  )
  const [horaBruta, setHoraBruta] = useState(item?.horaAgendamento ?? modelo?.horaAgendamento ?? '')
  const [subitensTexto, setSubitensTexto] = useState(
    (item?.subitens ?? modelo?.subitens)?.map((subitem) => subitem.titulo).join('\n') ?? '',
  )
  const [modoTempo, setModoTempo] = useState(item?.modoTempo ?? modelo?.modoTempo ?? 'livre')
  const [minutosFoco, setMinutosFoco] = useState(item?.minutosFoco ?? modelo?.minutosFoco ?? 25)
  const [minutosPausa, setMinutosPausa] = useState(item?.minutosPausa ?? modelo?.minutosPausa ?? 5)
  const quadroInicial = item?.quadroKanban ?? modelo?.quadroKanban ?? QUADRO_KANBAN_PADRAO
  const [colunasTexto, setColunasTexto] = useState(
    quadroInicial.colunas.map((coluna) => coluna.titulo).join('\n'),
  )
  const [colunaConclusao, setColunaConclusao] = useState(quadroInicial.colunaConclusao)
  const regraModelo = modelo?.agenda.modo === 'repetir' ? modelo.agenda.regra : undefined
  const [frequencia, setFrequencia] = useState<Frequencia>(regraModelo?.frequencia ?? 'diario')
  const [diasSemana, setDiasSemana] = useState<number[]>(regraModelo?.diasSemana ?? [])
  const [intervaloDias, setIntervaloDias] = useState(regraModelo?.intervaloDias ?? 3)
  const [diaMes, setDiaMes] = useState(regraModelo?.diaMes ?? 10)
  const [terminaEm, setTerminaEm] = useState(regraModelo?.terminaEm ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvarComoModelo, setSalvarComoModelo] = useState(false)
  const idDias = useId()
  const idAgenda = useId()
  const idModoTempo = useId()
  const idSemana = useId()

  const parseRegra = repeticaoSchema.safeParse({
    frequencia,
    ...(frequencia === 'semanal' ? { diasSemana } : {}),
    ...(frequencia === 'cadaN' ? { intervaloDias } : {}),
    ...(frequencia === 'mensal' ? { diaMes } : {}),
    ...(terminaEm ? { terminaEm } : {}),
  })
  const proximas = parseRegra.success
    ? calcularProximasOcorrencias(parseRegra.data, hoje, 3)
    : []

  function alternarDiaSemana(dia: number) {
    setDiasSemana((atuais) =>
      atuais.includes(dia) ? atuais.filter((valor) => valor !== dia) : [...atuais, dia].sort(),
    )
  }

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
    if (modoAgenda === 'dias' && dias.length === 0) {
      setErro('Escolha pelo menos um dia no calendário.')
      return
    }
    if (modoAgenda === 'dias' && dias.length > LIMITE_DIAS_AGENDAMENTO) {
      setErro(`Escolha no máximo ${LIMITE_DIAS_AGENDAMENTO} dias.`)
      return
    }
    if (modoAgenda === 'repetir' && !parseRegra.success) {
      setErro(parseRegra.error.issues[0]?.message ?? 'Revise a regra de repetição.')
      return
    }
    if (modoAgenda === 'repetir' && proximas.length === 0) {
      setErro('A regra não tem próximas ocorrências dentro do término escolhido.')
      return
    }
    const hora = normalizarHora(horaBruta)
    if (horaBruta.trim() !== '' && hora === null) {
      setErro('Informe um horário válido (ex.: 17:00).')
      return
    }
    if (tipo === 'cronometro' && modoTempo === 'focoPausa') {
      if (!Number.isInteger(minutosFoco) || minutosFoco < 1 || minutosFoco > 180) {
        setErro('O foco deve ter entre 1 e 180 minutos.')
        return
      }
      if (!Number.isInteger(minutosPausa) || minutosPausa < 1 || minutosPausa > 60) {
        setErro('A pausa deve ter entre 1 e 60 minutos.')
        return
      }
    }

    let quadro: ReturnType<typeof quadroKanbanSchema.parse> | undefined
    if (tipo === 'kanban') {
      const colunas = colunasTexto
        .split('\n')
        .map((texto) => texto.trim())
        .filter(Boolean)
        .map((texto, indice) => ({
          id: quadroInicial.colunas[indice]?.id ?? `coluna-${indice + 1}`,
          titulo: texto,
        }))
      const colunaConclusaoValida = colunas.some((coluna) => coluna.id === colunaConclusao)
      const destino = colunaConclusaoValida ? colunaConclusao : colunas.at(-1)?.id
      const resultadoQuadro = quadroKanbanSchema.safeParse({
        colunas,
        colunaConclusao: destino,
      })
      if (!resultadoQuadro.success) {
        setErro('O quadro precisa de 2 a 12 colunas e uma coluna de conclusão válida.')
        return
      }
      quadro = resultadoQuadro.data
    }

    const proximosDias =
      modoAgenda === 'hoje'
        ? [hoje]
        : modoAgenda === 'dias'
          ? [...dias].sort()
          : [proximas[0]]
    const titulosSubitens =
      tipo === 'lista'
        ? subitensTexto
            .split('\n')
            .map((subitem) => subitem.trim())
            .filter(Boolean)
        : []
    if (titulosSubitens.length > 100) {
      setErro('A lista pode ter no máximo 100 subitens.')
      return
    }
    if (titulosSubitens.some((subitem) => subitem.length > LIMITE_TITULO)) {
      setErro(`Cada subitem pode ter no máximo ${LIMITE_TITULO} caracteres.`)
      return
    }
    const subitens =
      tipo === 'lista'
        ? (() => {
            const porTitulo = new Map<string, NonNullable<Item['subitens']>>()
            for (const anterior of item?.subitens ?? []) {
              const existentes = porTitulo.get(anterior.titulo) ?? []
              existentes.push(anterior)
              porTitulo.set(anterior.titulo, existentes)
            }
            return titulosSubitens.map((subitemTitulo) => {
              const anterior = porTitulo.get(subitemTitulo)?.shift()
              return {
                id: anterior?.id ?? gerarId(),
                titulo: subitemTitulo,
                concluido: anterior?.concluido ?? false,
              }
            })
          })()
        : undefined

    setErro(null)
    setSalvando(true)
    try {
      const entrada: EntradaItem = {
        titulo: tituloLimpo,
        descricao: descricao.trim(),
        tipo,
        diasAgendamento: proximosDias,
        horaAgendamento: hora ?? undefined,
        ...(subitens === undefined ? {} : { subitens }),
        ...(tipo === 'cronometro'
          ? {
              modoTempo,
              ...(modoTempo === 'focoPausa' ? { minutosFoco, minutosPausa } : {}),
            }
          : {}),
        ...(quadro === undefined ? {} : { quadroKanban: quadro }),
      }
      const salvouItem = await aoSalvar(entrada)
      if (salvouItem && salvarComoModelo && aoSalvarModelo) {
        let agenda: AgendaModelo
        if (modoAgenda === 'repetir' && parseRegra.success) {
          agenda = { modo: 'repetir', regra: parseRegra.data }
        } else if (modoAgenda === 'hoje' || modoAgenda === 'dias') {
          agenda = { modo: modoAgenda }
        } else {
          throw new Error('Regra de repetição inválida para salvar o modelo.')
        }
        const salvouModelo = await aoSalvarModelo({
          titulo: tituloLimpo,
          descricao: descricao.trim(),
          tipo,
          ...(subitens === undefined ? {} : { subitens: subitens.map((subitem) => ({ ...subitem, concluido: false })) }),
          ...(tipo === 'cronometro'
            ? { modoTempo, ...(modoTempo === 'focoPausa' ? { minutosFoco, minutosPausa } : {}) }
            : {}),
          ...(quadro === undefined ? {} : { quadroKanban: quadro }),
          agenda,
          ...(hora === null ? {} : { horaAgendamento: hora }),
        })
        if (!salvouModelo) setErro('O item foi criado, mas não foi possível salvar o modelo.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form className="item-form" onSubmit={(evento) => void enviar(evento)} noValidate>
      <Input
        label="Título"
        value={titulo}
        onChange={(evento) => setTitulo(evento.target.value)}
        placeholder="Ex.: Pagar energia"
        maxLength={LIMITE_TITULO}
        erro={erro ?? undefined}
        required
      />

      {tipo === 'lista' ? (
        <TextArea
          label="Subitens (um por linha)"
          value={subitensTexto}
          onChange={(evento) => setSubitensTexto(evento.target.value)}
          placeholder={'Frutas\nPão\nCafé'}
          rows={5}
        />
      ) : null}

      {tipo === 'cronometro' ? (
        <fieldset className="item-form-grupo">
          <legend className="campo-label" id={idModoTempo}>
            Modo do cronômetro
          </legend>
          <div className="item-form-opcoes" role="group" aria-labelledby={idModoTempo}>
            <button
              type="button"
              className={`item-form-opcao${modoTempo === 'livre' ? ' is-selected' : ''}`}
              aria-pressed={modoTempo === 'livre'}
              onClick={() => setModoTempo('livre')}
            >
              Cronômetro livre
            </button>
            <button
              type="button"
              className={`item-form-opcao${modoTempo === 'focoPausa' ? ' is-selected' : ''}`}
              aria-pressed={modoTempo === 'focoPausa'}
              onClick={() => setModoTempo('focoPausa')}
            >
              Foco e pausa
            </button>
          </div>
          {modoTempo === 'focoPausa' ? (
            <div className="item-form-dupla">
              <Input
                label="Foco (minutos)"
                type="number"
                min={1}
                max={180}
                value={minutosFoco}
                onChange={(evento) => setMinutosFoco(Number(evento.target.value))}
              />
              <Input
                label="Pausa (minutos)"
                type="number"
                min={1}
                max={60}
                value={minutosPausa}
                onChange={(evento) => setMinutosPausa(Number(evento.target.value))}
              />
            </div>
          ) : (
            <p className="item-form-ajuda">Inicie, pause e finalize quando quiser.</p>
          )}
        </fieldset>
      ) : null}

      {tipo === 'kanban' ? (
        <>
          <TextArea
            label="Colunas (uma por linha)"
            value={colunasTexto}
            onChange={(evento) => setColunasTexto(evento.target.value)}
            rows={4}
          />
          <label className="campo">
            <span className="campo-label">Coluna de conclusão</span>
            <select
              className="campo-controle"
              value={colunaConclusao}
              onChange={(evento) => setColunaConclusao(evento.target.value)}
            >
              {colunasTexto
                .split('\n')
                .map((texto) => texto.trim())
                .filter(Boolean)
                .map((texto, indice) => (
                  <option
                    key={`${indice}-${texto}`}
                    value={quadroInicial.colunas[indice]?.id ?? `coluna-${indice + 1}`}
                  >
                    {texto}
                  </option>
                ))}
            </select>
          </label>
        </>
      ) : null}

      <fieldset className="item-form-grupo" aria-labelledby={idAgenda}>
        <legend className="campo-label" id={idAgenda}>
          Quando
        </legend>
        <div className="item-form-opcoes" role="group" aria-labelledby={idAgenda}>
          {(['hoje', 'dias', 'repetir'] as const).map((modo) => (
            <button
              key={modo}
              type="button"
              className={`item-form-opcao${modoAgenda === modo ? ' is-selected' : ''}`}
              aria-pressed={modoAgenda === modo}
              onClick={() => setModoAgenda(modo)}
            >
              {modo === 'hoje' ? 'Hoje' : modo === 'dias' ? 'Dias' : 'Repetir'}
            </button>
          ))}
        </div>

        {modoAgenda === 'dias' ? (
          <div className="campo">
            <span className="campo-label" id={idDias}>
              Escolha um ou mais dias
            </span>
            <CalendarioMulti valor={dias} aoSelecionar={setDias} rotuloId={idDias} />
          </div>
        ) : null}

        {modoAgenda === 'repetir' ? (
          <div className="item-form-repeticao">
            <label className="campo">
              <span className="campo-label">Repetição</span>
              <select
                className="campo-controle"
                value={frequencia}
                onChange={(evento) => setFrequencia(evento.target.value as Frequencia)}
              >
                <option value="diario">Todo dia</option>
                <option value="semanal">Dias da semana</option>
                <option value="cadaN">A cada N dias</option>
                <option value="mensal">Todo mês em um dia</option>
              </select>
            </label>
            {frequencia === 'semanal' ? (
              <div className="item-form-dias-semana" role="group" aria-labelledby={idSemana}>
                <span className="campo-label" id={idSemana}>
                  Dias da semana
                </span>
                {DIAS_SEMANA.map(({ valor, rotulo }) => (
                  <button
                    key={valor}
                    type="button"
                    className={`item-form-dia${diasSemana.includes(valor) ? ' is-selected' : ''}`}
                    aria-pressed={diasSemana.includes(valor)}
                    onClick={() => alternarDiaSemana(valor)}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            ) : null}
            {frequencia === 'cadaN' ? (
              <Input
                label="A cada quantos dias?"
                type="number"
                min={1}
                max={365}
                value={intervaloDias}
                onChange={(evento) => setIntervaloDias(Number(evento.target.value))}
              />
            ) : null}
            {frequencia === 'mensal' ? (
              <Input
                label="Dia do mês"
                type="number"
                min={1}
                max={31}
                value={diaMes}
                onChange={(evento) => setDiaMes(Number(evento.target.value))}
              />
            ) : null}
            <Input
              label="Termina em (opcional)"
              type="date"
              min={hoje}
              value={terminaEm}
              onChange={(evento) => setTerminaEm(evento.target.value)}
            />
            <p className="item-form-previa" aria-live="polite">
              {parseRegra.success && proximas.length > 0
                ? `Próximas: ${proximas.map(dataCurta).join(', ')}`
                : 'Escolha uma regra válida para ver as próximas datas.'}
            </p>
            {parseRegra.success ? (
              <p className="item-form-ajuda">{rotuloRegraRepeticao(parseRegra.data)}</p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <details className="item-form-mais-opcoes" open={Boolean(horaBruta || descricao)}>
        <summary>Mais opções</summary>
        <Input
          label="Horário"
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
        <TextArea
          label="Descrição"
          value={descricao}
          onChange={(evento) => setDescricao(evento.target.value)}
          placeholder="Detalhes opcionais"
          maxLength={LIMITE_DESCRICAO}
        />
      </details>

      {aoSalvarModelo ? (
        <label className="item-form-salvar-modelo">
          <input
            type="checkbox"
            checked={salvarComoModelo}
            onChange={(evento) => setSalvarComoModelo(evento.target.checked)}
          />
          <span>Salvar como modelo</span>
        </label>
      ) : null}

      {erro ? <p className="campo-erro" role="alert">{erro}</p> : null}
      <div className="formulario-acoes">
        <Button variante="secundario" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : item ? 'Salvar' : 'Criar item'}
        </Button>
      </div>
    </form>
  )
}
