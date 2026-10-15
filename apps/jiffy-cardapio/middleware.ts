import { NextResponse, type NextRequest } from 'next/server'
import { reescreverCaminhoSlugPublico } from '@/src/infrastructure/seo/reescreverCaminhoSlugPublico'

/** Preflight CORS para o BFF público (ex.: Design no Gestor em outro host). */
export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const pathnameLimpo = reescreverCaminhoSlugPublico(request.nextUrl.pathname)
  if (pathnameLimpo) {
    const url = request.nextUrl.clone()
    url.pathname = pathnameLimpo
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.rewrite(url)
    }
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/public/:path*',
    '/((?!_next/static|_next/image|favicon.ico|images|videos|instrucoes|.*\\..*).*)',
  ],
}
