import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET deve ter no mínimo 32 caracteres'),
  APP_URL: z.string().url('APP_URL deve ser uma URL válida').default('http://localhost:5173'),
  PORT: z.coerce.number().int().positive().default(3000),
  // SMTP para recuperação de senha (opcional: se ausente, o fluxo fica desativado)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Anlly <nao-responda@anlly.app>'),
})

export const env = envSchema.parse(process.env)
