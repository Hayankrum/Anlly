'use client'

import { useActionState, useState } from 'react'
import { login } from '../usuarios.actions'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import CampoSenha from '../components/CampoSenha'

async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string
  return await login(email, senha)
}

export default function LoginPage() {
  const [estado, formAction, pending] = useActionState(loginAction, null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Entrar</h1>

      <form action={formAction} className="flex flex-col gap-4">
        {estado?.error && (
          <p role="alert" className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2" style={{ color: '#f87171' }}>
            {estado.error}
          </p>
        )}

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

        <CampoSenha name="senha" label="Senha" value={senha} onChange={setSenha} />

        <button
          type="submit"
          disabled={pending}
          className="font-medium rounded-lg px-4 py-2 transition-colors w-fit disabled:opacity-50"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          {pending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid var(--border-color)' }}></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>ou</span>
        </div>
      </div>

      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-2 transition-colors"
        style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Entrar com Google
      </button>

      <p className="text-sm mt-6" style={{ color: 'var(--text-tertiary)' }}>
        Não tem conta?{' '}
        <Link href="/usuarios/registro" className="hover:underline" style={{ color: 'var(--text-primary)' }}>
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
