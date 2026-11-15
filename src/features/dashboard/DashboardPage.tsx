import { Link } from 'react-router-dom'
import { Check, CheckCircle2, Columns3, Flame, ListChecks, Timer } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { TipoItem } from '@shared/schemas/item'
import type { Item } from '../../db/schema'
import { usePodeEditar } from '../conta/usePodeEditar'
import { useHistoricoConclusoes, useItems } from '../items/useItems'
import { todayStr } from '../calendario/datas'
import { diasConsecutivos, progressoDaSemana } from './progresso'
import './dashboard.css'

interface Categoria {
  tipo: TipoItem
  titulo: string
  cor: string
  icone: LucideIcon
}

const CATEGORIAS: Categoria[] = [
  { tipo: 'padrao', titulo: 'Simples', cor: '#ef5b4f', icone: Check },
  { tipo: 'lista', titulo: 'Lista', cor: '#d89000', icone: ListChecks },
  { tipo: 'cronometro', titulo: 'Tempo', cor: '#3b82f6', icone: Timer },
  { tipo: 'kanban', titulo: 'Quadro', cor: '#16a36a', icone: Columns3 },
]

function tipoDoItem(item: Item): TipoItem {
  return item.tipo ?? 'padrao'
}

function percentual(concluidos: number, total: number): number {
  return total === 0 ? 0 : Math.round((concluidos / total) * 100)
}

export function DashboardPage() {
  const podeEditar = usePodeEditar()
  const itens = useItems()
  const historico = useHistoricoConclusoes()
  const hoje = todayStr()
  const semana = progressoDaSemana(historico, hoje)
  const sequencia = diasConsecutivos(historico, hoje)

  if (!podeEditar) {
    return (
      <div className="pagina dashboard">
        <div className="aviso aviso--compacto" role="status">
          Entre na sua conta para acompanhar seu progresso.{' '}
          <Link to="/conta">Acessar conta</Link>
        </div>
      </div>
    )
  }

  const total = itens.length
  const concluidos = itens.filter((item) => item.concluido).length
  const pendentes = total - concluidos
  const aproveitamento = percentual(concluidos, total)
  const totalSemana = semana.reduce((soma, dia) => soma + dia.concluidos, 0)
  const maximoSemana = Math.max(...semana.map((dia) => dia.concluidos), 1)
  const categorias = CATEGORIAS.map((categoria) => {
    const daCategoria = itens.filter((item) => tipoDoItem(item) === categoria.tipo)
    return {
      ...categoria,
      total: daCategoria.length,
      concluidos: daCategoria.filter((item) => item.concluido).length,
    }
  })

  return (
    <div className="pagina dashboard">
      <section
        className="cartao dashboard-painel dashboard-semana"
        aria-labelledby="dashboard-semana-titulo"
      >
        <div className="dashboard-painel-cabecalho">
          <h2 id="dashboard-semana-titulo">Sua semana</h2>
          <span className="dashboard-semana-total">{totalSemana} nesta semana</span>
        </div>
        <div
          className="dashboard-grafico-semana"
          role="list"
          aria-label="Conclusões por dia nesta semana"
        >
          {semana.map((dia) => (
            <div
              key={dia.data}
              className={`dashboard-dia${dia.hoje ? ' dashboard-dia--hoje' : ''}`}
              role="listitem"
              aria-label={`${dia.rotulo}, dia ${dia.dia}: ${dia.concluidos} itens concluídos${dia.hoje ? ', hoje' : ''}`}
            >
              <span className="dashboard-dia-quantidade">{dia.concluidos || ''}</span>
              <div className="dashboard-dia-area">
                <span
                  className="dashboard-dia-barra"
                  style={{
                    height: `${dia.concluidos === 0 ? 4 : Math.max(18, (dia.concluidos / maximoSemana) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="dashboard-semana-rotulos" aria-hidden="true">
          {semana.map((dia) => (
            <span key={dia.data} className={dia.hoje ? 'eh-hoje' : undefined}>
              {dia.rotulo}
            </span>
          ))}
        </div>
      </section>

      <section className="dashboard-resumo" aria-label="Resumo do progresso">
        <article className="cartao dashboard-metrica dashboard-metrica--ofensiva">
          <span className="dashboard-metrica-icone">
            <Flame size={18} fill="currentColor" aria-hidden="true" />
          </span>
          <span className="dashboard-metrica-info">
            <span className="dashboard-metrica-rotulo">Ofensiva</span>
            <strong>
              {sequencia} {sequencia === 1 ? 'dia' : 'dias'}
            </strong>
          </span>
        </article>
        <article className="cartao dashboard-metrica dashboard-metrica--total">
          <span className="dashboard-metrica-icone">
            <ListChecks size={18} aria-hidden="true" />
          </span>
          <span className="dashboard-metrica-info">
            <span className="dashboard-metrica-rotulo">Total</span>
            <strong>{total}</strong>
          </span>
        </article>
        <article className="cartao dashboard-metrica dashboard-metrica--feito">
          <span className="dashboard-metrica-icone">
            <CheckCircle2 size={18} aria-hidden="true" />
          </span>
          <span className="dashboard-metrica-info">
            <span className="dashboard-metrica-rotulo">Concluídos</span>
            <strong>{concluidos}</strong>
          </span>
        </article>
        <article className="cartao dashboard-metrica dashboard-metrica--pendente">
          <span className="dashboard-metrica-icone">
            <Timer size={18} aria-hidden="true" />
          </span>
          <span className="dashboard-metrica-info">
            <span className="dashboard-metrica-rotulo">Pendentes</span>
            <strong>{pendentes}</strong>
          </span>
        </article>
      </section>

      {total === 0 ? (
        <div className="lista-vazia">
          <p className="lista-vazia-titulo">Seu progresso começa com o primeiro passo</p>
          <Link className="btn btn--primario" to="/itens">
            Criar primeiro item
          </Link>
        </div>
      ) : (
        <div className="dashboard-grade">
          <section
            className="cartao dashboard-painel dashboard-progresso"
            aria-labelledby="dashboard-progresso-titulo"
          >
            <div className="dashboard-painel-cabecalho">
              <h2 id="dashboard-progresso-titulo">Conclusão geral</h2>
            </div>
            <div className="dashboard-grafico-geral">
              <div
                className="dashboard-rosca"
                role="img"
                aria-label={`${aproveitamento}% concluído: ${concluidos} concluídos e ${pendentes} pendentes`}
                style={{
                  background: `conic-gradient(var(--cor-sucesso) 0 ${aproveitamento}%, var(--cor-trilha) ${aproveitamento}% 100%)`,
                }}
              >
                <span>
                  <strong>{aproveitamento}%</strong>
                  <small>concluído</small>
                </span>
              </div>
            </div>
          </section>

          <section
            className="cartao dashboard-painel dashboard-categorias"
            aria-labelledby="dashboard-categorias-titulo"
          >
            <div className="dashboard-painel-cabecalho">
              <h2 id="dashboard-categorias-titulo">Itens por tipo</h2>
            </div>
            <ul>
              {categorias.map(
                ({ tipo, titulo, cor, icone: Icone, total: quantidade, concluidos: feitos }) => (
                  <li key={tipo} style={{ '--categoria-cor': cor } as CSSProperties}>
                    <span className="dashboard-categoria-icone">
                      <Icone size={16} aria-hidden="true" />
                    </span>
                    <span className="dashboard-categoria-nome">{titulo}</span>
                    <span className="dashboard-categoria-total">
                      {feitos}/{quantidade}
                    </span>
                    <span
                      className="dashboard-categoria-barra"
                      role="img"
                      aria-label={`${titulo}: ${feitos} de ${quantidade} concluídos`}
                    >
                      <span
                        className="dashboard-categoria-feitos"
                        style={{
                          width: `${quantidade === 0 ? 0 : (feitos / quantidade) * 100}%`,
                        }}
                      />
                    </span>
                  </li>
                ),
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
