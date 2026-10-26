import { Eye, EyeOff } from 'lucide-react'
import { Input } from '../../shared/ui/Input'
import { LIMITE_SENHA } from './conta.api'

interface CampoSenhaProps {
  label: string
  valor: string
  aoMudar: (valor: string) => void
  /** Estado compartilhado do olho — o formulário guarda um só para todos os campos. */
  verSenha: boolean
  aoAlternarVisibilidade: () => void
  autoComplete: string
  placeholder?: string
}

/**
 * Campo de senha com o botão de mostrar/ocultar. O olho é controlado pelo
 * pai para que um clique valha para os campos do mesmo formulário.
 */
export function CampoSenha({
  label,
  valor,
  aoMudar,
  verSenha,
  aoAlternarVisibilidade,
  autoComplete,
  placeholder,
}: CampoSenhaProps) {
  return (
    <Input
      label={label}
      type={verSenha ? 'text' : 'password'}
      value={valor}
      onChange={(evento) => aoMudar(evento.target.value)}
      autoComplete={autoComplete}
      minLength={LIMITE_SENHA}
      placeholder={placeholder}
      required
      sufixo={
        <button
          type="button"
          className="campo-sufixo"
          onClick={aoAlternarVisibilidade}
          aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={verSenha}
          title={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {verSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      }
    />
  )
}
