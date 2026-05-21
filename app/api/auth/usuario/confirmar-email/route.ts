import { NextRequest, NextResponse } from 'next/server'
import { AUTH_USUARIO_CONFIRMAR_EMAIL } from '@/src/shared/constants/authUsuarioApiPaths'
import {
  extrairBearerAuthorization,
  proxyAuthUsuarioBearerPost,
} from '../_shared/proxyAuthUsuarioBearerPost'

/**
 * POST /api/auth/usuario/confirmar-email
 * Token no header Authorization: Bearer &lt;token&gt; (não no body).
 */
export async function POST(request: NextRequest) {
  const token = extrairBearerAuthorization(request.headers.get('authorization'))
  if (!token) {
    return NextResponse.json(
      { error: 'Token ausente. Envie o cabeçalho Authorization: Bearer com o token do e-mail.' },
      { status: 400 }
    )
  }
  return proxyAuthUsuarioBearerPost(AUTH_USUARIO_CONFIRMAR_EMAIL, token, undefined)
}
