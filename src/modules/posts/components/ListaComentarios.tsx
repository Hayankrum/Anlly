'use client'

import { useRouter } from 'next/navigation'
import { deletarComentario, editarComentario } from '../comentarios.actions'
import { useState } from 'react'

interface Comentario {
  id: number
  texto: string
  criadoEm: Date | string
  autor: {
    id: number
    nome: string
  }
}

interface ListaComentariosProps {
  comentarios: Comentario[]
  usuarioLogadoId?: number
}

export default function ListaComentarios({ comentarios, usuarioLogadoId }: ListaComentariosProps) {
  const router = useRouter()
  const [deletandoId, setDeletandoId] = useState<number | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [textoEditado, setTextoEditado] = useState('')
  const [salvandoId, setSalvandoId] = useState<number | null>(null)

  const handleDeletar = async (id: number) => {
    setDeletandoId(id)
    await deletarComentario(id)
    setDeletandoId(null)
    router.refresh()
  }

  const iniciarEdicao = (id: number, textoAtual: string) => {
    setEditandoId(id)
    setTextoEditado(textoAtual)
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setTextoEditado('')
  }

  const salvarEdicao = async (id: number) => {
    if (!textoEditado.trim()) return
    setSalvandoId(id)
    await editarComentario(id, textoEditado)
    setSalvandoId(null)
    setEditandoId(null)
    setTextoEditado('')
    router.refresh()
  }

  if (comentarios.length === 0) {
    return <p className="text-sm mt-4" style={{ color: 'var(--text-tertiary)' }}>Nenhum comentário ainda.</p>
  }

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {comentarios.length} comentário{comentarios.length !== 1 ? 's' : ''}
      </h3>
      {comentarios.map((comentario) => (
        <div key={comentario.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                {comentario.autor.nome.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{comentario.autor.nome}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {new Date(comentario.criadoEm).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {usuarioLogadoId === comentario.autor.id && (
              <div className="flex items-center gap-2">
                {editandoId === comentario.id ? (
                  <>
                    <button
                      onClick={() => salvarEdicao(comentario.id)}
                      disabled={salvandoId === comentario.id || !textoEditado.trim()}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {salvandoId === comentario.id ? '...' : 'Salvar'}
                    </button>
                    <button
                      onClick={cancelarEdicao}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => iniciarEdicao(comentario.id, comentario.texto)}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletar(comentario.id)}
                      disabled={deletandoId === comentario.id}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {deletandoId === comentario.id ? '...' : 'Excluir'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {editandoId === comentario.id ? (
            <textarea
              value={textoEditado}
              onChange={(e) => setTextoEditado(e.target.value)}
              rows={2}
              className="w-full mt-2 text-sm rounded-lg px-3 py-2 focus:outline-none transition-colors resize-y"
              style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          ) : (
            <p className="mt-2 text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{comentario.texto}</p>
          )}
        </div>
      ))}
    </div>
  )
}
