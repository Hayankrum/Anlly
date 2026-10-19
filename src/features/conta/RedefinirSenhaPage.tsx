import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { useToast } from '../../shared/ui/Toast'
import { LIMITE_SENHA, redefinirSenha } from './conta.api'
import { soltarCampoFocado } from '../../shared/lib/dom'
import './conta.css'

export function RedefinirSenhaPage() {
  const { mostrar } = useToast()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [feito, setFeito] = useState(false)
  const [verSenha, setVerSenha] = useState(false)

  if (!token) {
    return (
      <div className="pagina">
        <section className="cartao">
          <h2 className="cartao-titulo">Link inválido</h2>
          <p className="conta-erro" role="alert">
            O link de recuperação não contém um token válido. Solicite um novo link.
          </p>
          <Link className="sobre-link" to="/conta">
            Voltar para Conta
          </Link>
        </section>
      </div>
    )
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (senha.length < LIMITE_SENHA) {
      setErro(`A senha precisa de pelo menos ${LIMITE_SENHA} caracteres.`)
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      await redefinirSenha(token, senha)
      setFeito(true)
      soltarCampoFocado()
      mostrar('Senha redefinida com sucesso. Entre com a nova senha.', { tipo: 'sucesso' })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível redefinir a senha.')
    } finally {
      setEnviando(false)
    }
  }

  if (feito) {
    return (
      <div className="pagina">
        <section className="cartao">
          <h2 className="cartao-titulo">Senha redefinida</h2>
          <p className="sobre-texto">
            Sua senha foi alterada. Entre na sua conta com a nova senha.
          </p>
          <Link className="sobre-link" to="/conta">
            <KeyRound size={16} aria-hidden="true" />
            Ir para Conta
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="pagina">
      <section className="cartao" aria-labelledby="titulo-redefinir">
        <h2 className="cartao-titulo" id="titulo-redefinir">
          Redefinir senha
        </h2>
        <p className="sobre-texto">Escolha uma nova senha para a sua conta.</p>
        <form className="conta-formulario" onSubmit={(evento) => void enviar(evento)} noValidate>
          <Input
            label="Nova senha"
            type={verSenha ? 'text' : 'password'}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            autoComplete="new-password"
            minLength={LIMITE_SENHA}
            required
            sufixo={
              <button
                type="button"
                className="campo-sufixo"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={verSenha}
                title={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          <Input
            label="Confirmar nova senha"
            type={verSenha ? 'text' : 'password'}
            value={confirmar}
            onChange={(evento) => setConfirmar(evento.target.value)}
            autoComplete="new-password"
            minLength={LIMITE_SENHA}
            required
            sufixo={
              <button
                type="button"
                className="campo-sufixo"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={verSenha}
                title={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          {erro ? (
            <p className="conta-erro" role="alert">
              {erro}
            </p>
          ) : null}
          <Button type="submit" block disabled={enviando}>
            {enviando ? 'Aguarde…' : 'Redefinir senha'}
          </Button>
        </form>
        <Link className="sobre-link" to="/conta">
          Voltar para Conta
        </Link>
      </section>
    </div>
  )
}
