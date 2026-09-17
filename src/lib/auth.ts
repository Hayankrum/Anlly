import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from './prisma'

const isProd = process.env.NODE_ENV === 'production'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  debug: !isProd,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        if (!user.email) return false

        const existingUser = await prisma.usuario.findUnique({
          where: { email: user.email },
        })

        if (!existingUser) {
          await prisma.usuario.create({
            data: {
              nome: user.name || user.email.split('@')[0],
              email: user.email,
              senha: '',
            },
          })
        }

        return true
      } catch (error) {
        console.error('[Auth] signIn error:', error)
        return true
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.id = token.sub as string
      }
      return session
    },
  },
  pages: {
    signIn: '/usuarios/login',
  },
})
