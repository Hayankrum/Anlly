'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePushSubscription } from '@/lib/usePushSubscription'
import { toggleNotificacoes, atualizarPreferenciasNotificacao } from '@/modules/usuarios/usuarios.actions'
import { useTheme } from '@/lib/ThemeProvider'
import BotaoDeletarPerfil from '@/modules/usuarios/components/BotaoDeletarPerfil'
import BotaoLogout from '@/modules/usuarios/components/BotaoLogout'
import InstallPWAButton from '@/components/InstallPWAButton'
import { ConfigSkeleton } from '@/components/Skeletons'

interface UserInfo {
  id: number
  temSenha: boolean
  notificarComentarios: boolean
  notificarSistema: boolean
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { isSubscribed, isSubscribing, isSupported, isLoading, subscribe, unsubscribe } = usePushSubscription()
  const [toggling, setToggling] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [preferencias, setPreferencias] = useState({
    notificarComentarios: true,
    notificarSistema: true,
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setUser(data)
          setPreferencias({
            notificarComentarios: data.notificarComentarios ?? true,
            notificarSistema: data.notificarSistema ?? true,
          })
        }
      })
      .catch(() => {
        if (!cancelled) router.push('/usuarios/login')
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const handleToggleNotificacoes = async () => {
    if (toggling || isSubscribing) return
    setToggling(true)
    setStatusMessage(null)
    try {
      if (isSubscribed) {
        const result = await unsubscribe()
        if (!result.success) {
          showStatus('error', result.error || 'Erro ao desativar')
        } else {
          await toggleNotificacoes(false)
          showStatus('success', 'Notificações push desativadas')
        }
      } else {
        const result = await subscribe()
        if (!result.success) {
          showStatus('error', result.error || 'Erro ao ativar notificações.')
        } else {
          await toggleNotificacoes(true)
          showStatus('success', 'Notificações push ativadas! Configurações copiadas das notificações normais.')
        }
      }
    } finally {
      setToggling(false)
    }
  }

  const handlePreferenciaChange = async (campo: 'notificarComentarios' | 'notificarSistema', valor: boolean) => {
    setPreferencias((prev) => ({ ...prev, [campo]: valor }))
    const result = await atualizarPreferenciasNotificacao({ [campo]: valor })
    if (result.error) {
      setPreferencias((prev) => ({ ...prev, [campo]: !valor }))
      showStatus('error', result.error)
    }
  }

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Configurações</h1>
        <ConfigSkeleton />
      </div>
    )
  }

  return (
    <div>
      <Link
        href={`/usuarios/${user.id}`}
        className="text-sm transition-colors mb-6 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Voltar ao perfil
      </Link>

      <h1 className="text-2xl font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>Configurações</h1>

      {statusMessage && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            backgroundColor: statusMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: statusMessage.type === 'success' ? '#16a34a' : '#dc2626',
          }}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Aplicativo</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Instalar PWA</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Adicione à tela inicial para acesso rápido
              </p>
            </div>
            <InstallPWAButton />
          </div>
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Aparência</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tema</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {theme === 'dark' ? 'Tema escuro ativo' : 'Tema claro ativo'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
            >
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
          </div>
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Notificações</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Notificações push</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Receba notificações push no seu dispositivo
              </p>
            </div>
            {isSupported ? (
              <button
                onClick={handleToggleNotificacoes}
                disabled={toggling || isSubscribing}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={isSubscribed ? { backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' } : { backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
              >
                {isLoading || toggling || isSubscribing ? '...' : isSubscribed ? 'Desativar' : 'Ativar'}
              </button>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Não suportado</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-zinc-600'}`} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {isSubscribed ? 'Push ativo' : 'Push inativo'}
            </span>
          </div>
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Preferências de notificação</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Controle quais tipos de notificação deseja receber
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Comentários</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Quando alguém comentar nos seus posts
                </p>
              </div>
              <div
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ backgroundColor: preferencias.notificarComentarios ? 'var(--btn-primary-bg)' : 'var(--btn-secondary-bg)' }}
                onClick={() => handlePreferenciaChange('notificarComentarios', !preferencias.notificarComentarios)}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full transition-transform"
                  style={{ backgroundColor: 'var(--btn-primary-text)', transform: preferencias.notificarComentarios ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sistema</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Atualizações e novidades do aplicativo
                </p>
              </div>
              <div
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ backgroundColor: preferencias.notificarSistema ? 'var(--btn-primary-bg)' : 'var(--btn-secondary-bg)' }}
                onClick={() => handlePreferenciaChange('notificarSistema', !preferencias.notificarSistema)}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full transition-transform"
                  style={{ backgroundColor: 'var(--btn-primary-text)', transform: preferencias.notificarSistema ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Conta</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <BotaoLogout />
            </div>
            <div className="pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <BotaoDeletarPerfil id={user.id} temSenha={user.temSenha} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
