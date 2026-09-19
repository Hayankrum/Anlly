'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Usuario {
  id: number
  nome: string
  email: string
  notificacoesAtivas: boolean
  notificarSistema: boolean
  inscricoes: { id: number; endpoint: string; criadoEm: string }[]
}

interface LogEnvio {
  key: string
  timestamp: string
  tipo: 'sistema'
  destinatario: string
  destinatarioId: number
  resultado: 'enviado' | 'bloqueado' | 'erro'
  motivo?: string
  titulo: string
}

export default function PushTestPanel() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEnvio[]>([])
  const logCounter = useRef(0)
  const [titulo, setTitulo] = useState('Teste Push')
  const [mensagem, setMensagem] = useState('Notificacao de teste')
  const [url, setUrl] = useState('/')
  const [enviando, setEnviando] = useState<number | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'com inscricao'>('todos')

  const fetchUsuarios = useCallback(() => {
    fetch('/api/notifications/list-users')
      .then((res) => res.json())
      .then((data) => setUsuarios(data.usuarios || []))
      .catch(() => console.error('Erro ao buscar usuarios'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  const addLog = useCallback((log: Omit<LogEnvio, 'key' | 'timestamp'>) => {
    logCounter.current++
    const key = `${logCounter.current}-${Date.now()}`
    setLogs((prev) => [{ ...log, key, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev].slice(0, 50))
  }, [])

  const verificarSeReceberia = (u: Usuario) => {
    if (!u.notificacoesAtivas) return { receberia: false, motivo: 'Notificacoes desativadas' }
    if (!u.notificarSistema) return { receberia: false, motivo: 'Tipo sistema desativado' }
    if (u.inscricoes.length === 0) return { receberia: false, motivo: 'Sem inscricoes push' }
    return { receberia: true, motivo: null }
  }

  const enviarParaUsuario = async (u: Usuario) => {
    setEnviando(u.id)
    const verificacao = verificarSeReceberia(u)
    if (!verificacao.receberia) {
      addLog({ tipo: 'sistema', destinatario: u.nome, destinatarioId: u.id, resultado: 'bloqueado', motivo: verificacao.motivo || undefined, titulo })
      setEnviando(null)
      return
    }
    try {
      const res = await fetch('/api/notifications/test-push-individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: u.id, titulo, mensagem, url }),
      })
      const data = await res.json()
      addLog({ tipo: 'sistema', destinatario: u.nome, destinatarioId: u.id, resultado: data.enviadosComSucesso > 0 ? 'enviado' : 'erro', titulo })
    } catch {
      addLog({ tipo: 'sistema', destinatario: u.nome, destinatarioId: u.id, resultado: 'erro', motivo: 'Erro na requisicao', titulo })
    }
    setEnviando(null)
  }

  const enviarParaTodos = async () => {
    setEnviando(-1)
    try {
      await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, mensagem, url }),
      })
      for (const u of usuarios) {
        const verificacao = verificarSeReceberia(u)
        addLog({ tipo: 'sistema', destinatario: u.nome, destinatarioId: u.id, resultado: verificacao.receberia ? 'enviado' : 'bloqueado', motivo: verificacao.motivo || undefined, titulo })
      }
    } catch {
      addLog({ tipo: 'sistema', destinatario: 'Todos', destinatarioId: 0, resultado: 'erro', motivo: 'Erro na requisicao', titulo })
    }
    setEnviando(null)
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtro === 'ativos') return u.notificacoesAtivas
    if (filtro === 'com inscricao') return u.inscricoes.length > 0
    return true
  })

  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter((u) => u.notificacoesAtivas).length,
    comInscricao: usuarios.filter((u) => u.inscricoes.length > 0).length,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total</div>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-xl font-bold text-green-500">{stats.ativos}</div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Ativos</div>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-xl font-bold text-blue-500">{stats.comInscricao}</div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Com Push</div>
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <input type="text" placeholder="Titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          <input type="text" placeholder="Mensagem" value={mensagem} onChange={(e) => setMensagem(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          <input type="text" placeholder="URL (opcional)" value={url} onChange={(e) => setUrl(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex gap-3">
          <button onClick={enviarParaTodos} disabled={enviando !== null}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}>
            Enviar Todos - Sistema
          </button>
          <button onClick={() => { setLogs([]); setLoading(true); fetchUsuarios() }}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Usuarios ({usuariosFiltrados.length})
              </h3>
              <div className="flex gap-1">
                {(['todos', 'ativos', 'com inscricao'] as const).map((f) => (
                  <button key={f} onClick={() => setFiltro(f)} className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: filtro === f ? 'var(--btn-primary-bg)' : 'var(--btn-secondary-bg)', color: filtro === f ? 'var(--btn-primary-text)' : 'var(--text-primary)' }}>
                    {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Push'}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Carregando...</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {usuariosFiltrados.map((u) => {
                  const verifSistema = verificarSeReceberia(u)
                  return (
                    <div key={u.id} className="rounded-lg p-3 flex items-center gap-3"
                      style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{u.nome}</span>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{u.inscricoes.length} push</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${u.notificacoesAtivas ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={`w-1.5 h-1.5 rounded-full ${u.notificarSistema ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => enviarParaUsuario(u)} disabled={enviando !== null}
                          className="px-2 py-1 rounded text-xs disabled:opacity-50"
                          style={{ backgroundColor: verifSistema.receberia ? '#16a34a20' : '#dc262620', color: verifSistema.receberia ? '#16a34a' : '#dc2626' }}>
                          {enviando === u.id ? '...' : 'Sys'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Log ({logs.length})</h3>
              <button onClick={() => setLogs([])} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Limpar</button>
            </div>
            <div className="space-y-1 max-h-[350px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Nenhum envio</p>
              ) : (
                logs.map((log) => (
                  <div key={log.key} className="rounded p-2 text-xs"
                    style={{ backgroundColor: log.resultado === 'enviado' ? '#dcfce710' : log.resultado === 'bloqueado' ? '#fef3c710' : '#fee2e210' }}>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${log.resultado === 'enviado' ? 'bg-green-500' : log.resultado === 'bloqueado' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span style={{ color: 'var(--text-primary)' }}>{log.destinatario}</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>({log.tipo})</span>
                    </div>
                    {log.motivo && <p className="ml-2.5 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{log.motivo}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
