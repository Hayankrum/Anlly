import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Columns3, ListChecks, Plus, Timer, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { TipoItem } from '@shared/schemas/item'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { usePodeEditar } from '../conta/usePodeEditar'
import * as itemsRepo from './items.repo'
import type { EntradaItem } from './items.repo'
import * as modelosRepo from './modelos.repo'
import type { EntradaModelo, Modelo } from '@shared/schemas/modelo'
import { useSessao } from '../conta/useSessao'
import { ItemForm } from './ItemForm'
import './itens.css'

interface ContextoCriacao {
  dataInicial?: string
  agendaModoInicial?: 'hoje' | 'dias'
}

const SECOES: {
  titulo: string
  icone: LucideIcon
  tipo: TipoItem
  classe: string
}[] = [
  {
    titulo: 'Simples',
    icone: Check,
    tipo: 'padrao',
    classe: 'simples',
  },
  {
    titulo: 'Lista',
    icone: ListChecks,
    tipo: 'lista',
    classe: 'lista',
  },
  {
    titulo: 'Tempo',
    icone: Timer,
    tipo: 'cronometro',
    classe: 'tempo',
  },
  {
    titulo: 'Quadro',
    icone: Columns3,
    tipo: 'kanban',
    classe: 'quadro',
  },
]

function lerContextoCriacao(valor: unknown): ContextoCriacao | null {
  if (typeof valor !== 'object' || valor === null) return null
  const estado = valor as Record<string, unknown>
  const dataInicial =
    typeof estado.dataInicial === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(estado.dataInicial)
      ? estado.dataInicial
      : undefined
  const agendaModoInicial =
    estado.agendaModoInicial === 'dias' || estado.agendaModoInicial === 'hoje'
      ? estado.agendaModoInicial
      : undefined
  if (dataInicial === undefined && agendaModoInicial === undefined) return null
  return { dataInicial, agendaModoInicial }
}

export function ItensPage() {
  const podeEditar = usePodeEditar()
  const sessao = useSessao()
  const navegar = useNavigate()
  const location = useLocation()
  const { mostrar } = useToast()
  const [contexto] = useState(() => lerContextoCriacao(location.state))
  const [tipoCriacao, setTipoCriacao] = useState<TipoItem | null>(() =>
    contexto ? 'padrao' : null,
  )
  const [modeloInicial, setModeloInicial] = useState<Modelo | undefined>()
  const [editandoModelos, setEditandoModelos] = useState(false)
  const modelos = useLiveQuery(() => modelosRepo.listar(), [], [])

  useEffect(() => {
    if (sessao === null) return
    void modelosRepo.garantirExemplosIniciais(sessao.usuarioId).catch(() => {
      mostrar('Não foi possível carregar os modelos iniciais.', { tipo: 'erro' })
    })
  }, [mostrar, sessao?.usuarioId])

  useEffect(() => {
    if (contexto) navegar(location.pathname, { replace: true, state: null })
  }, [contexto, location.pathname, navegar])

  function abrirFormulario(tipo: TipoItem) {
    if (!podeEditar) {
      mostrar('Entre na sua conta para criar itens.', {
        tipo: 'erro',
        acao: { rotulo: 'Entrar', aoClicar: () => navegar('/conta') },
      })
      return
    }
    setModeloInicial(undefined)
    setTipoCriacao(tipo)
  }

  function abrirModelo(modelo: Modelo) {
    if (!podeEditar) {
      mostrar('Entre na sua conta para criar itens.', {
        tipo: 'erro',
        acao: { rotulo: 'Entrar', aoClicar: () => navegar('/conta') },
      })
      return
    }
    setModeloInicial(modelo)
    setTipoCriacao(modelo.tipo)
  }

  async function salvarModelo(entrada: EntradaModelo): Promise<boolean> {
    try {
      await modelosRepo.salvar(entrada)
      mostrar('Modelo salvo.', { tipo: 'sucesso' })
      return true
    } catch (erro) {
      if (erro instanceof ErroCotaExcedida) {
        mostrar(erro.message, {
          tipo: 'erro',
          duracao: 10000,
          acao: { rotulo: 'Ver armazenamento', aoClicar: () => navegar('/config') },
        })
      } else {
        mostrar('Não foi possível salvar o modelo.', { tipo: 'erro' })
      }
      return false
    }
  }

  async function excluirModelo(id: string) {
    try {
      await modelosRepo.excluir(id)
      mostrar('Modelo removido.', { tipo: 'sucesso' })
    } catch (erro) {
      if (erro instanceof ErroCotaExcedida) mostrar(erro.message, { tipo: 'erro' })
      else mostrar('Não foi possível remover o modelo.', { tipo: 'erro' })
    }
  }

  async function salvarNovo(entrada: EntradaItem): Promise<boolean> {
    if (!podeEditar) {
      setTipoCriacao(null)
      mostrar('Entre na sua conta para criar itens.', {
        tipo: 'erro',
        acao: { rotulo: 'Entrar', aoClicar: () => navegar('/conta') },
      })
      return false
    }
    try {
      await itemsRepo.criar(entrada)
      setTipoCriacao(null)
      setModeloInicial(undefined)
      mostrar('Item criado', { tipo: 'sucesso' })
      return true
    } catch (erro) {
      if (erro instanceof ErroCotaExcedida) {
        mostrar(erro.message, {
          tipo: 'erro',
          duracao: 10000,
          acao: { rotulo: 'Ver armazenamento', aoClicar: () => navegar('/config') },
        })
        return false
      }
      mostrar('Não foi possível criar o item', { tipo: 'erro' })
      return false
    }
  }

  const secaoAtual = SECOES.find((secao) => secao.tipo === tipoCriacao)
  function rotuloAgenda(modelo: Modelo): string {
    if (modelo.agenda.modo === 'hoje') return 'Hoje'
    if (modelo.agenda.modo === 'dias') return 'Dias'
    return 'Repetir'
  }

  return (
    <div className="pagina itens-pagina">
      {SECOES.map(({ titulo, icone: Icone, tipo, classe }) => (
        <section
          className={`itens-secao itens-secao--${classe}`}
          key={tipo}
          aria-labelledby={`itens-${tipo}`}
        >
          <h2 className="itens-secao-titulo" id={`itens-${tipo}`}>
            {titulo}
          </h2>
          <ul className="itens-lista-horizontal" aria-label={`Opções de ${titulo}`}>
            <li>
              <button
                className="itens-botao itens-botao--novo"
                type="button"
                aria-label={`Novo item do tipo ${titulo}`}
                onClick={() => abrirFormulario(tipo)}
              >
                <span className="itens-botao-icone" aria-hidden="true">
                  <Plus size={28} />
                </span>
                <span className="itens-botao-titulo">Novo</span>
                <Icone className="itens-botao-tipo" size={17} aria-hidden="true" />
              </button>
            </li>
            {(modelos ?? [])
              .filter((modelo) => modelo.tipo === tipo)
              .map((modelo) => (
                <li className="itens-modelo-item" key={modelo.id}>
                  <button
                    className="itens-botao itens-botao--modelo"
                    type="button"
                    aria-label={`Usar o modelo ${modelo.titulo}`}
                    onClick={() => void abrirModelo(modelo)}
                  >
                    <span className="itens-botao-icone">
                      <span className="itens-modelo-inicial" aria-hidden="true">
                        {modelo.titulo.slice(0, 1).toLocaleUpperCase('pt-BR')}
                      </span>
                    </span>
                    <span className="itens-botao-titulo">{modelo.titulo}</span>
                    <span className="itens-modelo-agenda">{rotuloAgenda(modelo)}</span>
                  </button>
                  {editandoModelos ? (
                    <button
                      className="itens-modelo-excluir"
                      type="button"
                      aria-label={`Excluir modelo ${modelo.titulo}`}
                      onClick={() => void excluirModelo(modelo.id)}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ))}

      <button
        className="itens-editar-modelos"
        type="button"
        aria-pressed={editandoModelos}
        onClick={() => setEditandoModelos((atual) => !atual)}
      >
        {editandoModelos ? 'Concluir edição' : 'Editar modelos'}
      </button>

      <Modal
        aberto={tipoCriacao !== null}
        titulo={`Novo item: ${secaoAtual?.titulo ?? ''}`}
        onFechar={() => {
          setTipoCriacao(null)
          setModeloInicial(undefined)
        }}
        largura="estreito"
      >
        {tipoCriacao !== null && (
          <ItemForm
            key={`${tipoCriacao}:${modeloInicial?.id ?? 'novo'}`}
            tipoInicial={tipoCriacao}
            modelo={modeloInicial}
            dataInicial={contexto?.dataInicial}
            agendaModoInicial={contexto?.agendaModoInicial}
            aoCancelar={() => {
              setTipoCriacao(null)
              setModeloInicial(undefined)
            }}
            aoSalvar={salvarNovo}
            aoSalvarModelo={salvarModelo}
          />
        )}
      </Modal>
    </div>
  )
}
