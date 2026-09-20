'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePushSubscription } from '@/lib/usePushSubscription'
import { toggleNotificacoes } from '@/modules/usuarios/usuarios.actions'
import { ListaSkeleton } from '@/components/Skeletons'
import PushTestPanel from '@/components/testes/PushTestPanel'
import { formatarHora } from '@/modules/eventos/dateUtils'
import { useFormatoHora } from '@/lib/HorarioProvider'

interface NotificacaoHistorico {
  id: number
  titulo: string
  mensagem: string
  url: string | null
  lida: boolean
  criadaEm: string
}

function notificarAtualizacao() {
  window.dispatchEvent(new Event('notifications:updated'))
  localStorage.setItem('notifications:updated', String(Date.now()))
}

export default function NotificacoesPage() {
  const { isSubscribed, isSupported, isLoading, subscribe, unsubscribe } = usePushSubscription()
  const { formato } = useFormatoHora()
  const [historico, setHistorico] = useState<NotificacaoHistorico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(true)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [excluindo, setExcluindo] = useState<number | null>(null)

  const fetchHistorico = () => {
    fetch('/api/notifications/history')
      .then((res) => res.json())
      .then((data) => {
        setHistorico(data.notificacoes || [])
        setLoadingHistorico(false)
      })
      .catch(() => setLoadingHistorico(false))
  }

  useEffect(() => {
    fetchHistorico()
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const result = await unsubscribe()
      if (!result.success) {
        showStatus('error', result.error || 'Erro ao desativar')
      } else {
        await toggleNotificacoes(false)
        showStatus('success', 'Notificações desativadas')
      }
    } else {
      const result = await subscribe()
      if (!result.success) {
        showStatus('error', result.error || 'Erro ao ativar notificações.')
      } else {
        await toggleNotificacoes(true)
        showStatus('success', 'Notificações ativadas!')
      }
    }
  }

  const marcarComoLida = async (id: number) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setHistorico((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    )
    notificarAtualizacao()
  }

  const marcarTodasComoLidas = async () => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setHistorico((prev) =>
      prev.map((n) => ({ ...n, lida: true }))
    )
    notificarAtualizacao()
  }

  const excluirNotificacao = async (id: number) => {
    setExcluindo(id)
    await fetch('/api/notifications/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setHistorico((prev) => prev.filter((n) => n.id !== id))
    notificarAtualizacao()
    setExcluindo(null)
  }

  const excluirTodas = async () => {
    if (!confirm('Tem certeza que deseja excluir todas as notificações?')) return
    await fetch('/api/notifications/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setHistorico([])
    notificarAtualizacao()
  }

  const totalNaoLidas = historico.filter((n) => !n.lida).length

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Notificações</h1>
        <ListaSkeleton itens={4} />
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Notificações</h1>
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Seu navegador não suporta notificações push.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Notificações</h1>

      {statusMessage && (
        <div
          className="mb-4 p-3 rounded-lg text-sm whitespace-pre-line"
          style={{
            backgroundColor: statusMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: statusMessage.type === 'success' ? '#16a34a' : '#dc2626',
          }}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSubscribed ? 'bg-green-500/20' : 'bg-zinc-500/20'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isSubscribed ? '#22c55e' : '#71717a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <h2 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Push</h2>
              <p className="text-xs" style={{ color: isSubscribed ? '#22c55e' : 'var(--text-tertiary)' }}>
                {isSubscribed ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={isSubscribed ? { backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' } : { backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
          >
            {isSubscribed ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6">
          <div className="pt-6 mb-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <h2 className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Testes de Push (dev)</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Ative as notificações acima e depois envie um push para você mesmo.</p>
          </div>
          <PushTestPanel />
        </div>
      )}

      <div className="pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Histórico</h2>
            {totalNaoLidas > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#f59e0b', color: '#000' }}>
                {totalNaoLidas}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {historico.some((n) => !n.lida) && (
              <button
                onClick={marcarTodasComoLidas}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                title="Marcar todas como lidas"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </button>
            )}
            {historico.length > 0 && (
              <button
                onClick={excluirTodas}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#dc2626' }}
                title="Excluir todas"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {loadingHistorico ? (
          <ListaSkeleton itens={4} altura="h-20" />
        ) : historico.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-tertiary)' }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhuma notificação</p>
          </div>
        ) : (
          <div className="space-y-2">
            {historico.map((notificacao) => (
              <div
                key={notificacao.id}
                className="rounded-lg p-3 transition-colors"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  opacity: notificacao.lida ? 0.6 : 1,
                }}
              >
                <div className="flex items-start gap-2">
                  {!notificacao.lida && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: '#22c55e' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {notificacao.titulo}
                    </h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{notificacao.mensagem}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(notificacao.criadaEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {formatarHora(new Date(notificacao.criadaEm), formato)}
                      </span>
                      {notificacao.url && (
                        <Link
                          href={notificacao.url}
                          className="text-[10px] transition-colors hover:underline"
                          style={{ color: 'var(--text-tertiary)' }}
                          onClick={() => { if (!notificacao.lida) marcarComoLida(notificacao.id) }}
                        >
                          Abrir →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notificacao.lida && (
                      <button
                        onClick={() => marcarComoLida(notificacao.id)}
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Marcar como lida"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => excluirNotificacao(notificacao.id)}
                      disabled={excluindo === notificacao.id}
                      className="p-1 rounded transition-colors disabled:opacity-50"
                      style={{ color: '#dc2626' }}
                      title="Excluir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}