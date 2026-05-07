import { NextRequest } from 'next/server'
import { ConfirmEmailRequestSchema } from '@/src/application/dto/auth/UsuarioAuthDTO'
import { AUTH_USUARIO_CONFIRMAR_EMAIL } from '@/src/shared/constants/authUsuarioApiPaths'
import { proxyAuthUsuarioPost } from '../_shared/proxyAuthUsuarioPost'

/** POST /api/auth/usuario/confirmar-email */
export async function POST(request: NextRequest) {
  return proxyAuthUsuarioPost(request, AUTH_USUARIO_CONFIRMAR_EMAIL, ConfirmEmailRequestSchema)
}
