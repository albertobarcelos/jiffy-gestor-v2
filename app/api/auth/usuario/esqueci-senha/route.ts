import { NextRequest } from 'next/server'
import { ForgotPasswordRequestSchema } from '@/src/application/dto/auth/UsuarioAuthDTO'
import { AUTH_USUARIO_ESQUECI_SENHA } from '@/src/shared/constants/authUsuarioApiPaths'
import { proxyAuthUsuarioPost } from '../_shared/proxyAuthUsuarioPost'

/** POST /api/auth/usuario/esqueci-senha */
export async function POST(request: NextRequest) {
  return proxyAuthUsuarioPost(request, AUTH_USUARIO_ESQUECI_SENHA, ForgotPasswordRequestSchema)
}
