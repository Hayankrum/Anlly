import { NextRequest, NextResponse } from 'next/server'

const ROTAS_PROTEGIDAS = ['/posts/novo']

export function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get('sessionToken')?.value
  const authjsSession = request.cookies.get('authjs.session-token')?.value
  const secureAuthjs = request.cookies.get('__Secure-authjs.session-token')?.value
  const { pathname } = request.nextUrl

  const precisaLogin =
    ROTAS_PROTEGIDAS.some(rota => pathname.startsWith(rota)) ||
    /^\/posts\/\d+\/editar/.test(pathname) ||
    /^\/usuarios\/\d+\/editar/.test(pathname) ||
    /^\/usuarios\/\d+\/senha/.test(pathname)

  if (precisaLogin && !sessionToken && !authjsSession && !secureAuthjs) {
    const url = request.nextUrl.clone()
    url.pathname = '/usuarios/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/posts/:path*', '/usuarios/:path*'],
}
