import { NextRequest } from 'next/server'
import { ResendConfirmationEmailRequestSchema } from '@/src/application/dto/auth/UsuarioAuthDTO'
import { AUTH_USUARIO_REENVIAR_CONFIRMACAO } from '@/src/shared/constants/authUsuarioApiPaths'
import { proxyAuthUsuarioPost } from '../_shared/proxyAuthUsuarioPost'

/** POST /api/auth/usuario/reenviar-confirmacao */
export async function POST(request: NextRequest) {
  return proxyAuthUsuarioPost(
    request,
    AUTH_USUARIO_REENVIAR_CONFIRMACAO,
    ResendConfirmationEmailRequestSchema
  )
}
