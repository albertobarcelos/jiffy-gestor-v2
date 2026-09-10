import { NextResponse, type NextRequest } from 'next/server'

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
  return NextResponse.next()
}

export const config = {
  matcher: '/api/public/:path*',
}
