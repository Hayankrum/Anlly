'use client'

import { useActionState, useState } from 'react'
import { alterarSenha } from '../usuarios.actions'
import Link from 'next/link'
import CampoSenha from '../components/CampoSenha'

interface Props {
  usuarioId: number
}

async function alterarAction(_prev: { error?: string; success?: string } | null, formData: FormData) {
  const id = Number(formData.get('id'))
  const senhaAtual = formData.get('senhaAtual') as string
  const novaSenha = formData.get('novaSenha') as string
  const confirmarSenha = formData.get('confirmarSenha') as string
  return await alterarSenha(id, senhaAtual, novaSenha, confirmarSenha)
}

export default function AlterarSenhaPage({ usuarioId }: Props) {
  const [estado, formAction, pending] = useActionState(alterarAction, null)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  return (
    <div>
      <Link
        href={`/usuarios/${usuarioId}`}
        className="text-sm transition-colors mb-6 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Voltar
      </Link>

      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Alterar senha</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={usuarioId} />

        {estado?.error && (
          <p role="alert" className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2" style={{ color: '#f87171' }}>
            {estado.error}
          </p>
        )}

        {estado?.success && (
          <p role="status" className="text-sm bg-green-950/40 border border-green-900 rounded-lg px-4 py-2" style={{ color: '#4ade80' }}>
            {estado.success}
          </p>
        )}

        <CampoSenha name="senhaAtual" label="Senha atual" value={senhaAtual} onChange={setSenhaAtual} />

        <CampoSenha name="novaSenha" label="Nova senha" minLength={8} placeholder="Mínimo 8 caracteres" value={novaSenha} onChange={setNovaSenha} />

        <CampoSenha name="confirmarSenha" label="Confirmar nova senha" minLength={8} placeholder="Repita a nova senha" value={confirmarSenha} onChange={setConfirmarSenha} />

        <button
          type="submit"
          disabled={pending}
          className="font-medium rounded-lg px-4 py-2 transition-colors w-fit disabled:opacity-50"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          {pending ? 'Alterando...' : 'Alterar senha'}
        </button>
      </form>
    </div>
  )
}
