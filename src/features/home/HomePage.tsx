import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { useToast } from '../../shared/ui/Toast'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { formatarDataISO } from '../../shared/lib/date'
import { useItems } from '../items/useItems'
import { usePodeEditar } from '../conta/usePodeEditar'
import type { Item } from '../../db/schema'
import * as itemsRepo from '../items/items.repo'
import { todayStr } from '../calendario/datas'
import { Trilha } from './Trilha'
import './home.css'

function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function dataCompacta(de: Date): string {
  const diaSemana = de.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\./g, '')
  const dia = de.toLocaleDateString('pt-BR', { day: 'numeric' })
  const mes = de.toLocaleDateString('pt-BR', { month: 'short' }).replace(/\./g, '')
  return `${primeiraMaiuscula(diaSemana)}, ${dia} ${mes}`
}

/** Concluídos primeiro, depois pendentes — ambos na ordem em que foram criados. */
function ordenarTrilha(itens: Item[]): Item[] {
  return [...itens].sort((a, b) => {
    if (a.concluido !== b.concluido) return a.concluido ? -1 : 1
    return a.criadoEm - b.criadoEm
  })
}

export function HomePage() {
  const podeEditar = usePodeEditar()
  const itensBrutos = useItems()
  const { mostrar } = useToast()
  const navegar = useNavigate()
  const [agora, setAgora] = useState(() => new Date())

  // Mantém a data da home virando o dia sem re-renderizar o app inteiro.
  useEffect(() => {
    const id = window.setInterval(() => setAgora(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  async function concluir(item: Item) {
    if (!podeEditar) return
    try {
      await itemsRepo.alternarConcluido(item)
    } catch (erro) {
      if (erro instanceof ErroCotaExcedida) {
        mostrar(erro.message, { tipo: 'erro', duracao: 10000 })
        return
      }
      mostrar('Não foi possível atualizar o item', { tipo: 'erro' })
    }
  }

  const hoje = todayStr(agora)
  const itens = useMemo(
    () =>
      podeEditar
        ? ordenarTrilha(itensBrutos.filter((item) => item.diasAgendamento?.includes(hoje)))
        : [],
    [podeEditar, itensBrutos, hoje],
  )
  const concluidos = itens.filter((item) => item.concluido).length
  const percentual = itens.length === 0 ? 0 : Math.round((concluidos / itens.length) * 100)

  return (
    <div className="pagina home">
      <header className="home-hero" aria-labelledby="home-data">
        <div className="home-hero-texto">
          <h1 className="home-data" id="home-data">
            {dataCompacta(agora)}
          </h1>
        </div>

        {itens.length > 0 && (
          <div className="home-hero-progresso" aria-label={`${percentual}% concluído`}>
            <svg viewBox="0 0 48 48" width={56} height={56} aria-hidden="true">
              <circle className="home-hero-anel-base" cx={24} cy={24} r={20} />
              <circle
                className="home-hero-anel-preenchido"
                cx={24}
                cy={24}
                r={20}
                strokeDasharray={`${(2 * Math.PI * 20 * percentual) / 100} ${2 * Math.PI * 20}`}
              />
            </svg>
            <span className="home-hero-percentual">{percentual}%</span>
          </div>
        )}
      </header>

      {podeEditar ? (
        <section className="home-jornada" aria-labelledby="jornada-titulo">
          <div className="secao-cabecalho">
            <h2 className="secao-titulo" id="jornada-titulo">
              Sua jornada
            </h2>
            {itens.length > 0 && (
              <span className="secao-contagem">
                {concluidos}/{itens.length}
              </span>
            )}
          </div>

          {itens.length === 0 ? (
            <div className="home-vazio">
              <span className="home-vazio-selo" aria-hidden="true">
                <img src={`${import.meta.env.BASE_URL}mascote.png`} alt="" />
              </span>
              {itensBrutos.length === 0 ? (
                <>
                  <p className="home-vazio-titulo">Seu caminho ainda está vazio</p>
                  <p className="home-vazio-nota">Adicione o primeiro passo da sua jornada.</p>
                  <Link
                    className="btn btn--primario"
                    to="/itens"
                    state={{ agendaModoInicial: 'hoje' }}
                  >
                    Criar primeiro item
                  </Link>
                </>
              ) : (
                <>
                  <p className="home-vazio-titulo">Nada agendado para hoje</p>
                  <p className="home-vazio-nota">
                    Agende um item para {formatarDataISO(hoje)} e ele aparece aqui.
                  </p>
                </>
              )}
            </div>
          ) : (
            <Trilha
              itens={itens}
              aoAbrir={(item) => navegar(`/itens/${item.id}`)}
              aoConcluir={(item) => void concluir(item)}
            />
          )}
        </section>
      ) : (
        <div className="aviso aviso--compacto" role="status">
          <UserRound size={16} aria-hidden="true" />
          <span>
            Sua lista está protegida. <Link to="/conta">Entre na sua conta</Link> para ver e
            criar itens — nada é apagado ao sair.
          </span>
        </div>
      )}

    </div>
  )
}
