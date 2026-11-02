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
  const categorias = CATEGORIAS.map((categoria) => {
    const daCategoria = itens.filter((item) => tipoDoItem(item) === categoria.tipo)
    return {
      ...categoria,
      total: daCategoria.length,
      concluidos: daCategoria.filter((item) => item.concluido).length,
    }
  })
  const maiorCategoria = Math.max(...categorias.map((categoria) => categoria.total), 1)
  const maximoSemana = Math.max(...semana.map((dia) => dia.concluidos), 1)

  return (
    <div className="pagina dashboard">
      <section className="dashboard-ofensiva" aria-label="Sequência de dias ativos">
        <span className="dashboard-ofensiva-icone"><Flame size={25} fill="currentColor" aria-hidden="true" /></span>
        <strong className="dashboard-ofensiva-numero">{sequencia}</strong>
        <span className="dashboard-ofensiva-texto">
          <strong>{sequencia === 1 ? 'dia consecutivo' : 'dias consecutivos'}</strong>
          <small>{sequencia > 0 ? 'Continue assim!' : 'Conclua um item para começar sua ofensiva.'}</small>
        </span>
      </section>

      <section className="dashboard-painel dashboard-semana" aria-labelledby="dashboard-semana-titulo">
        <div className="dashboard-painel-cabecalho">
          <div>
            <h2 id="dashboard-semana-titulo">Sua semana</h2>
            <p>Itens concluídos por dia</p>
          </div>
          <span className="dashboard-semana-total">
            {semana.reduce((soma, dia) => soma + dia.concluidos, 0)} nesta semana
          </span>
        </div>
        <div className="dashboard-grafico-semana" role="list" aria-label="Conclusões por dia nesta semana">
          {semana.map((dia) => (
            <div
              key={dia.data}
              className={`dashboard-dia${dia.hoje ? ' dashboard-dia--hoje' : ''}`}
              role="listitem"
              aria-label={`${dia.rotulo}, dia ${dia.dia}: ${dia.concluidos} itens concluídos${dia.hoje ? ', hoje' : ''}`}
            >
              <span className="dashboard-dia-quantidade">{dia.concluidos || ''}</span>
              <div className="dashboard-dia-trilho">
                <span
                  className="dashboard-dia-barra"
                  style={{ height: `${dia.concluidos === 0 ? 3 : Math.max(12, (dia.concluidos / maximoSemana) * 100)}%` }}
                />
              </div>
              <span className="dashboard-dia-rotulo">{dia.rotulo}</span>
              <span className="dashboard-dia-numero">{dia.dia}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-resumo" aria-label="Resumo do progresso">
        <article className="dashboard-metrica dashboard-metrica--total">
          <span className="dashboard-metrica-icone"><ListChecks size={19} aria-hidden="true" /></span>
          <span className="dashboard-metrica-rotulo">Total de itens</span>
          <strong>{total}</strong>
        </article>
        <article className="dashboard-metrica dashboard-metrica--feito">
          <span className="dashboard-metrica-icone"><CheckCircle2 size={19} aria-hidden="true" /></span>
          <span className="dashboard-metrica-rotulo">Concluídos</span>
          <strong>{concluidos}</strong>
        </article>
        <article className="dashboard-metrica dashboard-metrica--pendente">
          <span className="dashboard-metrica-icone"><Timer size={19} aria-hidden="true" /></span>
          <span className="dashboard-metrica-rotulo">Pendentes</span>
          <strong>{pendentes}</strong>
        </article>
        <article className="dashboard-metrica dashboard-metrica--percentual">
          <span className="dashboard-metrica-icone"><Check size={19} aria-hidden="true" /></span>
          <span className="dashboard-metrica-rotulo">Progresso geral</span>
          <strong>{aproveitamento}%</strong>
        </article>
      </section>

      {total === 0 ? (
        <section className="dashboard-vazio">
          <h2>Seu progresso começa com o primeiro passo</h2>
          <p>Crie um item para acompanhar suas tarefas e projetos por aqui.</p>
          <Link className="btn btn--primario" to="/itens">Criar primeiro item</Link>
        </section>
      ) : (
        <div className="dashboard-grade">
          <section className="dashboard-painel dashboard-progresso" aria-labelledby="dashboard-progresso-titulo">
            <div className="dashboard-painel-cabecalho">
              <h2 id="dashboard-progresso-titulo">Conclusão geral</h2>
            </div>
            <div className="dashboard-grafico-geral">
              <div
                className="dashboard-rosca"
                role="img"
                aria-label={`${aproveitamento}% concluído: ${concluidos} concluídos e ${pendentes} pendentes`}
                style={{
                  background: `conic-gradient(var(--cor-sucesso) 0 ${aproveitamento}%, var(--cor-superficie-2) ${aproveitamento}% 100%)`,
                }}
              >
                <span>
                  <strong>{aproveitamento}%</strong>
                  <small>concluído</small>
                </span>
              </div>
              <div className="dashboard-legenda">
                <span><i className="dashboard-legenda-ponto dashboard-legenda-ponto--feito" />Concluídos<strong>{concluidos}</strong></span>
                <span><i className="dashboard-legenda-ponto dashboard-legenda-ponto--pendente" />Pendentes<strong>{pendentes}</strong></span>
                <span className="dashboard-legenda-total">Total de itens<strong>{total}</strong></span>
              </div>
            </div>
          </section>

          <section className="dashboard-painel dashboard-categorias" aria-labelledby="dashboard-categorias-titulo">
            <div className="dashboard-painel-cabecalho">
              <h2 id="dashboard-categorias-titulo">Itens por tipo</h2>
            </div>
            <div className="dashboard-categoria-legenda" aria-label="Legenda do gráfico">
              <span><i className="dashboard-legenda-ponto dashboard-legenda-ponto--feito" />Concluídos</span>
              <span><i className="dashboard-legenda-ponto dashboard-legenda-ponto--pendente" />Pendentes</span>
            </div>
            <ul>
              {categorias.map(({ tipo, titulo, cor, icone: Icone, total: quantidade, concluidos: feitos }) => (
                <li key={tipo} style={{ '--categoria-cor': cor } as CSSProperties}>
                  <span className="dashboard-categoria-icone"><Icone size={17} aria-hidden="true" /></span>
                  <span className="dashboard-categoria-nome">{titulo}</span>
                  <span className="dashboard-categoria-total">{quantidade}</span>
                  <span
                    className="dashboard-categoria-barra"
                    role="img"
                    aria-label={`${titulo}: ${feitos} concluídos e ${quantidade - feitos} pendentes`}
                  >
                    <span
                      className="dashboard-categoria-feitos"
                      style={{ width: `${(feitos / maiorCategoria) * 100}%` }}
                    />
                    <span
                      className="dashboard-categoria-pendentes"
                      style={{ width: `${((quantidade - feitos) / maiorCategoria) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
