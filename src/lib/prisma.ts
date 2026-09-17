import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 100
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const isConnectionError = error instanceof Error &&
        (error.message.includes('ECONNREFUSED') ||
         error.message.includes('connection terminated') ||
         error.message.includes('too many connections'))

      if (isConnectionError && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * (i + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error('Unreachable')
}
