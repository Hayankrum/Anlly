'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletarUsuario } from '../usuarios.actions'
import CampoSenha from './CampoSenha'

interface Props {
  id: number
  temSenha: boolean
}

export default function BotaoDeletarPerfil({ id, temSenha }: Props) {
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  async function handleDeletar() {
    setErro('')
    if (temSenha && !senha.trim()) {
      setErro('Digite sua senha para confirmar')
      return
    }
    setCarregando(true)
    const resultado = await deletarUsuario(id, senha)
    if (resultado?.error) {
      setErro(resultado.error)
      setCarregando(false)
      return
    }
    router.push('/usuarios/login')
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="text-sm text-red-400 hover:text-red-300 transition-colors"
      >
        Deletar conta
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Deletar conta</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Tem certeza que quer deletar sua conta? Esta ação não pode ser desfeita.
            </p>
            {temSenha && (
              <div className="mb-4">
                <CampoSenha name="senha" label="Digite sua senha para confirmar" value={senha} onChange={setSenha} />
              </div>
            )}
            {erro && <p role="alert" className="text-sm mb-4" style={{ color: '#f87171' }}>{erro}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setAberto(false); setSenha(''); setErro('') }}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletar}
                disabled={carregando}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {carregando ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
