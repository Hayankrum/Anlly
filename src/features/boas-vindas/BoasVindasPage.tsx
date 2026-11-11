import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Columns3,
  Flame,
  ListChecks,
  Timer,
  WifiOff,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../shared/ui/Button'
import { marcarApresentacaoVista } from './primeiraVez'
import './boas-vindas.css'

/* ---------- Ilustrações: miniaturas do próprio app ---------- */

function IlustracaoMascote() {
  return (
    <span className="bv-mascote" aria-hidden="true">
      <img src={`${import.meta.env.BASE_URL}mascote.png`} alt="" />
    </span>
  )
}

function IlustracaoTrilha() {
  return (
    <div className="bv-canvas" aria-hidden="true">
      <div className="bv-trilha">
        <span className="bv-trilha-bloco bv-trilha-bloco--feito">
          <Check size={13} strokeWidth={3} />
          Estudar inglês
        </span>
        <span className="bv-trilha-bloco bv-trilha-bloco--feito">
          <Check size={13} strokeWidth={3} />
          Treino
        </span>
        <span className="bv-trilha-bloco">
          <span className="bv-trilha-bolinha" />
          Ler 20 min
        </span>
      </div>
    </div>
  )
}

function IlustracaoTipos() {
  const tipos = [
    { icone: Check, rotulo: 'Simples', classe: 'simples' },
    { icone: ListChecks, rotulo: 'Lista', classe: 'lista' },
    { icone: Timer, rotulo: 'Tempo', classe: 'tempo' },
    { icone: Columns3, rotulo: 'Quadro', classe: 'quadro' },
  ]
  return (
    <div className="bv-canvas" aria-hidden="true">
      <div className="bv-tipos">
        {tipos.map(({ icone: Icone, rotulo, classe }) => (
          <span key={rotulo} className={`bv-tipos-ladrilho bv-tipos-ladrilho--${classe}`}>
            <Icone size={17} />
            {rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}

function IlustracaoAgenda() {
  const comItens = [3, 7, 12, 15, 20]
  const semana = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
  return (
    <div className="bv-canvas" aria-hidden="true">
      <div className="bv-agenda">
        <div className="bv-agenda-semana">
          {semana.map((dia, indice) => (
            <span key={`${dia}-${indice}`}>{dia}</span>
          ))}
        </div>
        <div className="bv-agenda-grade">
          {Array.from({ length: 21 }, (_, indice) => indice + 1).map((dia) => {
            const classes = ['bv-agenda-dia']
            if (dia === 17) classes.push('bv-agenda-dia--hoje')
            if (dia === 19) classes.push('bv-agenda-dia--selecionado')
            if (comItens.includes(dia)) classes.push('bv-agenda-dia--com-item')
            return (
              <span key={dia} className={classes.join(' ')}>
                {dia}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function IlustracaoProgresso() {
  const alturas = [34, 52, 40, 66, 48, 20, 74]
  const hoje = 5
  const semana = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
  return (
    <div className="bv-canvas bv-progresso" aria-hidden="true">
      <span className="bv-ofensiva">
        <Flame size={12} strokeWidth={2.5} />
        5 dias
      </span>
      <div className="bv-grafico">
        {alturas.map((altura, indice) => (
          <span
            key={indice}
            className={`bv-grafico-barra${indice === hoje ? ' bv-grafico-barra--hoje' : ''}`}
            style={{ height: `${altura}%` }}
          />
        ))}
      </div>
      <div className="bv-grafico-rotulos">
        {semana.map((dia, indice) => (
          <span key={`${dia}-${indice}`}>{dia}</span>
        ))}
      </div>
    </div>
  )
}

function IlustracaoOffline() {
  return (
    <div className="bv-canvas bv-offline" aria-hidden="true">
      <div className="bv-offline-celular">
        <span className="bv-offline-topo" />
        <span className="bv-offline-item">
          <Check size={11} strokeWidth={3} />
          <span className="bv-offline-linha" style={{ width: '62%' }} />
        </span>
        <span className="bv-offline-item">
          <span className="bv-offline-bolinha" />
          <span className="bv-offline-linha" style={{ width: '78%' }} />
        </span>
        <span className="bv-offline-item">
          <span className="bv-offline-bolinha" />
          <span className="bv-offline-linha" style={{ width: '48%' }} />
        </span>
      </div>
      <span className="bv-offline-selo">
        <WifiOff size={15} strokeWidth={2.5} />
      </span>
    </div>
  )
}

/* ---------- Passos da apresentação ---------- */

interface Passo {
  titulo: string
  texto: string
  /** Linha extra de contexto, abaixo do texto principal. */
  detalhe: string
  ilustracao: ReactNode
}

const PASSOS: Passo[] = [
  {
    titulo: 'Bem-vindo ao Anlly',
    texto: 'Organize seu dia a dia: itens, agenda e progresso em um só lugar.',
    detalhe: 'Um tour rápido pelos principais recursos — leva menos de um minuto.',
    ilustracao: <IlustracaoMascote />,
  },
  {
    titulo: 'Trilha do dia',
    texto: 'Os itens agendados para hoje, em ordem, prontos para concluir com um toque.',
    detalhe: 'A barra no topo mostra o percentual do dia, e você alterna entre trilha e blocos.',
    ilustracao: <IlustracaoTrilha />,
  },
  {
    titulo: 'Quatro tipos de item',
    texto: 'Simples, lista, tempo e quadro — cada um do seu jeito.',
    detalhe: 'Marcação rápida, passos da lista, cronômetro e colunas do quadro.',
    ilustracao: <IlustracaoTipos />,
  },
  {
    titulo: 'Agenda',
    texto: 'Veja o que está agendado por dia, semana, mês e ano.',
    detalhe: 'O mapa de horas mostra cada compromisso no horário dele — inclusive repetições.',
    ilustracao: <IlustracaoAgenda />,
  },
  {
    titulo: 'Progresso e ofensiva',
    texto: 'Acompanhe o que concluiu e mantenha a sequência viva.',
    detalhe: 'A ofensiva conta os dias seguidos com pelo menos um item concluído.',
    ilustracao: <IlustracaoProgresso />,
  },
  {
    titulo: 'Funciona offline',
    texto: 'Os dados ficam no seu aparelho; a conta em nuvem é opcional.',
    detalhe: 'Instale na tela inicial e use sem internet, onde estiver.',
    ilustracao: <IlustracaoOffline />,
  },
]

/** Tela de apresentação, exibida na primeira vez que o app abre. */
export function BoasVindasPage() {
  const navegar = useNavigate()
  const [passo, setPasso] = useState(0)
  const [voltando, setVoltando] = useState(false)

  const atual = PASSOS[passo]
  const ultimo = passo === PASSOS.length - 1

  function finalizar() {
    marcarApresentacaoVista()
    navegar('/', { replace: true })
  }

  function avancar() {
    if (ultimo) {
      finalizar()
      return
    }
    setVoltando(false)
    setPasso((indice) => indice + 1)
  }

  function voltar() {
    setVoltando(true)
    setPasso((indice) => Math.max(0, indice - 1))
  }

  // Teclado: as setas também navegam entre os passos.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'ArrowRight' && !ultimo) {
        setVoltando(false)
        setPasso((indice) => indice + 1)
      } else if (evento.key === 'ArrowLeft' && passo > 0) {
        setVoltando(true)
        setPasso((indice) => indice - 1)
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [passo, ultimo])

  return (
    <main className="boas-vindas">
      <div className="boas-vindas-moldura">
        <div className="boas-vindas-topo">
          <div
            className="boas-vindas-progresso"
            role="progressbar"
            aria-label={`Passo ${passo + 1} de ${PASSOS.length}`}
            aria-valuemin={1}
            aria-valuemax={PASSOS.length}
            aria-valuenow={passo + 1}
          >
            <span
              className="boas-vindas-progresso-preenchimento"
              style={{ width: `${((passo + 1) / PASSOS.length) * 100}%` }}
            />
          </div>
          <Button variante="fantasma" className="boas-vindas-pular" onClick={finalizar}>
            Pular
          </Button>
        </div>

        <section
          key={passo}
          className={[
            'boas-vindas-passo',
            voltando ? 'boas-vindas-passo--tras' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-live="polite"
        >
          {atual.ilustracao}
          <h1 className="boas-vindas-titulo">{atual.titulo}</h1>
          <p className="boas-vindas-texto">{atual.texto}</p>
          <p className="boas-vindas-detalhe">{atual.detalhe}</p>
        </section>

        <div className="boas-vindas-controles">
          {passo > 0 && (
            <Button variante="fantasma" onClick={voltar}>
              <ArrowLeft size={18} aria-hidden="true" />
              Voltar
            </Button>
          )}
          <Button variante="primario" onClick={avancar}>
            {ultimo ? 'Começar' : 'Próximo'}
            {!ultimo && <ArrowRight size={18} aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </main>
  )
}
