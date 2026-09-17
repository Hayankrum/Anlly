'use client'

import { useActionState, useState } from 'react'
import { registrar } from '../usuarios.actions'
import Link from 'next/link'
import CampoSenha from '../components/CampoSenha'

async function registrarAction(_prev: { error?: string } | null, formData: FormData) {
  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string
  const confirmarSenha = formData.get('confirmarSenha') as string
  const aceitouTermos = formData.get('aceitouTermos') === 'on'
  return await registrar(nome, email, senha, confirmarSenha, aceitouTermos)
}

export default function RegistroPage() {
  const [estado, formAction, pending] = useActionState(registrarAction, null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Criar conta</h1>

      <form action={formAction} className="flex flex-col gap-4">
        {estado?.error && (
          <p role="alert" className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2" style={{ color: '#f87171' }}>
            {estado.error}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nome</label>
          <input
            name="nome"
            placeholder="Seu nome"
            maxLength={50}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input
            name="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg px-4 py-2 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <CampoSenha name="senha" label="Senha" minLength={8} value={senha} onChange={setSenha} />

        <CampoSenha name="confirmarSenha" label="Confirmar senha" minLength={8} placeholder="Repita a senha" value={confirmarSenha} onChange={setConfirmarSenha} />

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            name="aceitouTermos"
            id="aceitouTermos"
            required
            className="mt-1 rounded"
          />
          <label htmlFor="aceitouTermos" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Li e aceito os{' '}
            <Link href="/termos" target="_blank" className="hover:underline" style={{ color: 'var(--text-primary)' }}>
              Termos de Uso e Compromisso
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="font-medium rounded-lg px-4 py-2 transition-colors w-fit disabled:opacity-50"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          {pending ? 'Criando...' : 'Criar conta'}
        </button>

        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Já tem conta?{' '}
          <Link href="/usuarios/login" className="hover:underline" style={{ color: 'var(--text-primary)' }}>
            Entrar
          </Link>
        </p>
      </form>
    </div>
  )
}
