import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { env } from './env'

// Transportador SMTP lazy: só cria conexão quando há host configurado.
// Sem SMTP_HOST o fluxo de recuperação de senha fica desativado (404).
function criarTransportador(): Transporter | null {
  if (!env.SMTP_HOST) return null
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
}

let transportador: Transporter | null | undefined

function obterTransportador(): Transporter | null {
  if (transportador === undefined) transportador = criarTransportador()
  return transportador
}

export function smtpConfigurado(): boolean {
  return obterTransportador() !== null
}

export async function enviarEmailRedefinicao(email: string, urlRedefinicao: string): Promise<void> {
  const t = obterTransportador()
  if (!t) throw new Error('SMTP não configurado')

  const html = `
<!doctype html>
<html lang="pt-BR">
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e4e4e7;">
    <h1 style="font-size:20px;margin:0 0 8px;color:#18181b;">Redefinir sua senha — Anlly</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 24px;">
      Recebemos um pedido para redefinir a senha da sua conta.
      Se não foi você, ignore este e-mail.
    </p>
    <a href="${urlRedefinicao}"
       style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      Redefinir senha
    </a>
    <p style="font-size:12px;color:#a1a1aa;margin:24px 0 0;">
      Este link expira em 1 hora. Se o botão não funcionar, copie e cole o link no navegador:<br/>
      <span style="word-break:break-all;color:#71717a;">${urlRedefinicao}</span>
    </p>
  </div>
</body>
</html>`.trim()

  const texto = `Redefinir sua senha — Anlly

Recebemos um pedido para redefinir a senha da sua conta.
Se não foi você, ignore este e-mail.

Redefinir senha: ${urlRedefinicao}

Este link expira em 1 hora.`

  await t.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'Redefinir sua senha — Anlly',
    text: texto,
    html,
  })
}
