import { useState } from 'react'
import { Columns3, ListTodo, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TipoItem } from '@shared/schemas/item'
import { ErroCotaExcedida } from '../../shared/lib/cota'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/Toast'
import { usePodeEditar } from '../conta/usePodeEditar'
import * as itemsRepo from './items.repo'
import type { EntradaItem } from './items.repo'
import { ItemForm } from './ItemForm'
import './itens.css'

const SECOES: { titulo: string; icone: LucideIcon; tipo: TipoItem }[] = [
  { titulo: 'Lista', icone: ListTodo, tipo: 'padrao' },
  { titulo: 'Cronômetro', icone: Timer, tipo: 'cronometro' },
  { titulo: 'Quadro', icone: Columns3, tipo: 'kanban' },
]

export function ItensPage() {
  const podeEditar = usePodeEditar()
  const navegar = useNavigate()
  const { mostrar } = useToast()
  const [tipoCriacao, setTipoCriacao] = useState<TipoItem | null>(null)

  function abrirFormulario(tipo: TipoItem) {
    if (!podeEditar) {
      mostrar('Entre na sua conta para criar itens.', {
        tipo: 'erro',
        acao: { rotulo: 'Entrar', aoClicar: () => navegar('/conta') },
      })
      return
    }
    setTipoCriacao(tipo)
  }

  async function salvarNovo(entrada: EntradaItem) {
    if (!podeEditar) {
      setTipoCriacao(null)
      mostrar('Entre na sua conta para criar itens.', {
        tipo: 'erro',
        acao: { rotulo: 'Entrar', aoClicar: () => navegar('/conta') },
      })
      return
    }
    try {
      await itemsRepo.criar(entrada)
      setTipoCriacao(null)
      mostrar('Item criado', { tipo: 'sucesso' })
    } catch (erro) {
      if (erro instanceof ErroCotaExcedida) {
        mostrar(erro.message, {
          tipo: 'erro',
          duracao: 10000,
          acao: { rotulo: 'Ver armazenamento', aoClicar: () => navegar('/config') },
        })
        return
      }
      mostrar('Não foi possível criar o item', { tipo: 'erro' })
    }
  }

  return (
    <div className="pagina itens-pagina">
      {SECOES.map(({ titulo, icone: Icone, tipo }) => (
        <section className="itens-secao" key={tipo} aria-labelledby={`itens-${tipo}`}>
          <div className="itens-secao-cabecalho">
            <h2 className="itens-secao-titulo" id={`itens-${tipo}`}>
              {titulo}
            </h2>
          </div>
          <ul className="itens-lista-horizontal">
            <li>
              <button
                className="itens-botao"
                type="button"
                aria-label={`Criar item do tipo ${titulo}`}
                title={`Criar item do tipo ${titulo}`}
                onClick={() => abrirFormulario(tipo)}
              >
                <Icone size={42} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>
      ))}

      <Modal
        aberto={tipoCriacao !== null}
        titulo={`Novo item: ${SECOES.find((secao) => secao.tipo === tipoCriacao)?.titulo ?? ''}`}
        onFechar={() => setTipoCriacao(null)}
        largura="estreito"
      >
        {tipoCriacao !== null && (
          <ItemForm
            key={tipoCriacao}
            tipoInicial={tipoCriacao}
            aoCancelar={() => setTipoCriacao(null)}
            aoSalvar={salvarNovo}
          />
        )}
      </Modal>
    </div>
  )
}
