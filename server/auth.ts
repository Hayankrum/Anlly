import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { env } from './env'
import { prisma } from './prisma'
import { enviarEmailRedefinicao, smtpConfigurado } from './email'

const origensDev = [
  ...new Set([
    new URL(env.APP_URL).origin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ]),
]

export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.APP_URL,
  trustedOrigins: env.NODE_ENV === 'development' ? origensDev : [],
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    ...(smtpConfigurado()
      ? {
          sendResetPassword: async (data: { user: { email: string }; url: string }) => {
            await enviarEmailRedefinicao(data.user.email, data.url)
          },
          resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
        }
      : {}),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  // get-session é chamado a cada ciclo de sync; em dev fica livre (padrão better-auth)
  rateLimit: {
    enabled: env.NODE_ENV === 'production',
    window: 60,
    max: 120,
  },
})
