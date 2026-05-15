import { NextRequest } from 'next/server'
import { AutoRegistroRequestSchema } from '@/src/application/dto/auth/UsuarioAuthDTO'
import { AUTH_USUARIO_AUTO_REGISTRO } from '@/src/shared/constants/authUsuarioApiPaths'
import { proxyAuthUsuarioPost } from '../_shared/proxyAuthUsuarioPost'

/** POST /api/auth/usuario/auto-registro → upstream auto-registro (confirmação de e-mail). */
export async function POST(request: NextRequest) {
  return proxyAuthUsuarioPost(request, AUTH_USUARIO_AUTO_REGISTRO, AutoRegistroRequestSchema)
}
