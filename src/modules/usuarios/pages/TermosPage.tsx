'use client'

import { useActionState } from 'react'
import { aceitarTermos } from '../usuarios.actions'

async function aceitarTermosAction() {
  return await aceitarTermos()
}

export default function TermosPage() {
  const [estado, formAction, pending] = useActionState(aceitarTermosAction, null)

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Termos de Uso e Compromisso
      </h1>

      <div className="prose prose-sm max-w-none mb-8" style={{ color: 'var(--text-secondary)' }}>
        <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>1. Aceitação dos Termos</h2>
        <p className="mb-4">
          Ao acessar e utilizar esta plataforma, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
          Se não concordar com algum dos termos, não utilize a plataforma.
        </p>

        <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>2. Uso da Plataforma</h2>
        <p className="mb-4">
          Você concorda em utilizar a plataforma de forma ética e em conformidade com todas as leis e regulamentações aplicáveis. 
          É proibido utilizar a plataforma para atividades ilegais, fraudulentas ou que violem direitos de terceiros.
        </p>

        <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>3. Conteúdo do Usuário</h2>
        <p className="mb-4">
          Você é responsável por todo o conteúdo que publica na plataforma. Ao publicar conteúdo, você declara que possui 
          os direitos necessários e que o conteúdo não viola direitos de terceiros.
        </p>

        <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>4. Privacidade</h2>
        <p className="mb-4">
          Respeitamos sua privacidade. Seus dados pessoais serão tratados de acordo com nossa política de privacidade. 
          Não compartilhamos suas informações com terceiros sem seu consentimento.
        </p>

        <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>5. Responsabilidades</h2>
        <p className="mb-4">
          A plataforma é fornecida &quot;como está&quot;, sem garantias de qualquer tipo. Não nos responsabilizamos por danos 
          diretos ou indiretos decorrentes do uso da plataforma.
        </p>

        <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>6. Modificações</h2>
        <p className="mb-4">
          Reservamos o direito de modificar estes termos a qualquer momento. As modificações entram em vigor 
          imediatamente após a publicação na plataforma.
        </p>

        <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>7. Compromisso</h2>
        <p className="mb-4">
          Ao aceitar estes termos, você se compromete a:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Manter sua conta e senha seguras</li>
          <li>Não compartilhar sua conta com terceiros</li>
          <li>Reportar qualquer uso não autorizado de sua conta</li>
          <li>Respeitar os direitos de outros usuários</li>
          <li>Utilizar a plataforma de forma responsável</li>
        </ul>
      </div>

      {estado?.success && (
        <p className="text-sm bg-green-950/40 border border-green-900 rounded-lg px-4 py-2 mb-4" style={{ color: '#4ade80' }}>
          Termos aceitos com sucesso!
        </p>
      )}

      {estado?.error && (
        <p className="text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2 mb-4" style={{ color: '#f87171' }}>
          {estado.error}
        </p>
      )}

      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="font-medium rounded-lg px-6 py-3 transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          {pending ? 'Aceitando...' : 'Aceitar Termos e Compromisso'}
        </button>
      </form>
    </div>
  )
}
