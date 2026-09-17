'use client'

import { useActionState } from 'react'
import { aceitarTermos } from '@/modules/usuarios/usuarios.actions'

interface TermosModalProps {
  isOpen: boolean
  onClose?: () => void
  readonly?: boolean
}

async function aceitarTermosAction() {
  return await aceitarTermos()
}

export default function TermosModal({ isOpen, onClose, readonly = false }: TermosModalProps) {
  const [estado, formAction, pending] = useActionState(aceitarTermosAction, null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] mx-4 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Termo de Compromisso e Responsabilidade
          </h1>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg transition-colors hover:bg-[var(--btn-secondary-bg)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 prose prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
          <p className="mb-4">
            Ao utilizar esta plataforma para criar ou interagir com posts, o usuário declara estar ciente e de acordo
            com as condições estabelecidas neste Termo.
          </p>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>1. Sobre a plataforma</h2>
          <p className="mb-4">
            Esta é uma plataforma para criação, compartilhamento e exploração de posts, com suporte a comentários,
            geolocalização, notificações push e funcionamento offline.
          </p>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>2. Aceitação dos Termos</h2>
          <p className="mb-4">
            Ao acessar e utilizar a plataforma, o usuário concorda em cumprir e estar vinculado a estes Termos de Uso.
            Se não concordar com algum dos termos, não utilize a plataforma.
          </p>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>3. Uso da Plataforma</h2>
          <p className="mb-4">
            O usuário se compromete a utilizar a plataforma de forma ética, responsável e em conformidade com todas as
            leis e regulamentações aplicáveis.
          </p>
          <p className="mb-4">
            É proibido utilizar a plataforma para atividades ilícitas, fraudulentas, obtenção indevida de informações
            ou violação de direitos de terceiros.
          </p>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>4. Conteúdo do Usuário</h2>
          <p className="mb-4">
            O usuário é responsável por todo o conteúdo que publica na plataforma. Ao publicar conteúdo, declara que
            possui os direitos necessários e que o conteúdo não viola direitos de terceiros.
          </p>
          <p className="mb-4">
            O fato de um post estar disponível na plataforma não significa que seu conteúdo tenha sido analisado,
            aprovado ou validado pelo sistema.
          </p>
          <p className="mb-4">
            Caso seja identificado conteúdo que viole estas condições ou a legislação aplicável, o acesso ao conteúdo
            poderá ser restringido ou removido, conforme aplicável.
          </p>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>5. Responsabilidades</h2>
          <p className="mb-4">
            O autor de um post é responsável por seu conteúdo, finalidade e utilização. Isso inclui as informações
            apresentadas, a forma de divulgação e a utilização dos dados publicados.
          </p>
          <p className="mb-4">
            A plataforma é fornecida &quot;como está&quot;, sem garantias de qualquer tipo. Não nos responsabilizamos por danos
            diretos ou indiretos decorrentes do uso da plataforma.
          </p>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>6. Privacidade</h2>
          <p className="mb-4">
            Respeitamos a privacidade dos usuários. Os dados pessoais são tratados de acordo com a política de
            privacidade da plataforma e não são compartilhados com terceiros sem consentimento.
          </p>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>7. Disponibilidade e Modificações</h2>
          <p className="mb-4">
            Reservamo-nos o direito de modificar estes termos a qualquer momento. As modificações entram em vigor
            imediatamente após a publicação na plataforma.
          </p>
          <p className="mb-4">
            Determinadas funcionalidades, limitações e comportamentos do sistema poderão ser modificados durante seu
            desenvolvimento. Este Termo descreve as regras de utilização e não constitui uma oferta de serviço comercial.
          </p>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>8. Compromisso</h2>
          <p className="mb-4">
            Ao aceitar estes termos, o usuário se compromete a:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>manter sua conta e senha seguras;</li>
            <li>não compartilhar sua conta com terceiros;</li>
            <li>reportar qualquer uso não autorizado de sua conta;</li>
            <li>respeitar os direitos de outros usuários;</li>
            <li>utilizar a plataforma de forma responsável.</li>
          </ul>

          <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>9. Aceite</h2>
          <p className="mb-4">
            Ao criar ou utilizar um conteúdo na plataforma, o usuário declara que compreendeu que:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>o autor é responsável pelo conteúdo e pela finalidade de sua publicação;</li>
            <li>o autor é responsável pela utilização e interpretação das informações publicadas;</li>
            <li>a plataforma fornece a infraestrutura tecnológica para criação e apresentação dos conteúdos.</li>
          </ul>
          <p className="mb-4">
            O uso da plataforma representa a concordância do usuário com este Termo.
          </p>

          <p className="mt-6 font-semibold" style={{ color: 'var(--text-primary)' }}>Meu App — 2026</p>
          <p className="mb-4">Projeto desenvolvido para fins de demonstração e avaliação.</p>
        </div>

        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          {readonly ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full font-medium rounded-lg px-6 py-3 transition-colors"
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
            >
              Fechar
            </button>
          ) : (
            <>
              {estado?.success && (
                <div className="mb-3 text-sm bg-green-950/40 border border-green-900 rounded-lg px-4 py-2" style={{ color: '#4ade80' }}>
                  Termos aceitos com sucesso!
                </div>
              )}

              {estado?.error && (
                <div className="mb-3 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2" style={{ color: '#f87171' }}>
                  {estado.error}
                </div>
              )}

              <form action={formAction}>
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full font-medium rounded-lg px-6 py-3 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
                >
                  {pending ? 'Aceitando...' : 'Aceitar o Termo de Compromisso'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}