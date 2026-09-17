'use client'

import { useActionState, useState } from 'react'
import { editarPerfil } from '../usuarios.actions'
import Link from 'next/link'

interface Props {
  usuario: { id: number; nome: string; bio: string | null }
}

async function editarAction(_prev: { error?: string } | null, formData: FormData) {
  const id = Number(formData.get('id'))
  const nome = formData.get('nome') as string
  const bio = formData.get('bio') as string
  return await editarPerfil(id, nome, bio)
}

export default function EditarPerfilPage({ usuario }: Props) {
  const [estado, formAction, pending] = useActionState(editarAction, null)
  const [nome, setNome] = useState(usuario.nome)
  const [bio, setBio] = useState(usuario.bio ?? '')

  return (
    <div>
      <Link
        href={`/usuarios/${usuario.id}`}
        className="text-sm transition-colors mb-6 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Voltar
      </Link>

      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Editar perfil</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={usuario.id} />

        {estado?.error && (
          <p role="alert" className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2" style={{ color: '#f87171' }}>
            {estado.error}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nome</label>
          <input
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={50}
            className="rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Bio</label>
          <textarea
            name="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Fale um pouco sobre você..."
            rows={3}
            className="rounded-lg px-4 py-2 text-sm focus:outline-none resize-none transition-colors"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="font-medium rounded-lg px-4 py-2 transition-colors w-fit disabled:opacity-50"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          {pending ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}
