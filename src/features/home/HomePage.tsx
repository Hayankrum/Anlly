import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sprout, UserRound } from 'lucide-react'
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

function saudacao(de: Date): string {
  const hora = de.getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function dataLonga(de: Date): string {
  const diaSemana = de.toLocaleDateString('pt-BR', { weekday: 'long' })
  const data = de.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `${primeiraMaiuscula(diaSemana)}, ${data}`
}

function relogio(de: Date): string {
  return de.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

  // O relógio da home acompanha o minuto sem re-renderizar o app inteiro.
  useEffect(() => {
    const id = window.setInterval(() => setAgora(new Date()), 10_000)
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
      <header className="home-hero" aria-labelledby="home-saudacao">
        <div className="home-hero-texto">
          <p className="home-saudacao" id="home-saudacao">
            {saudacao(agora)}
          </p>
          <h1 className="home-data">{dataLonga(agora)}</h1>
          <p className="home-relogio">{relogio(agora)}</p>
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
                <Sprout size={34} />
              </span>
              {itensBrutos.length === 0 ? (
                <>
                  <p className="home-vazio-titulo">Seu caminho ainda está vazio</p>
                  <p className="home-vazio-nota">Adicione o primeiro passo da sua jornada.</p>
                  <Link className="btn btn--primario" to="/itens">
                    Criar primeiro item
                  </Link>
                </>
              ) : (
                <>
                  <p className="home-vazio-titulo">Nada agendado para hoje</p>
                  <p className="home-vazio-nota">
                    Agende um item para {formatarDataISO(hoje)} e ele aparece aqui.
                  </p>
                  <Link className="btn btn--primario" to="/itens">
                    Ver itens
                  </Link>
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
