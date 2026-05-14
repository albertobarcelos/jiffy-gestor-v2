import { NextRequest } from 'next/server'
import { ResetPasswordRequestSchema } from '@/src/application/dto/auth/UsuarioAuthDTO'
import { AUTH_USUARIO_REDEFINIR_SENHA } from '@/src/shared/constants/authUsuarioApiPaths'
import { proxyAuthUsuarioPost } from '../_shared/proxyAuthUsuarioPost'

/** POST /api/auth/usuario/redefinir-senha */
export async function POST(request: NextRequest) {
  return proxyAuthUsuarioPost(request, AUTH_USUARIO_REDEFINIR_SENHA, ResetPasswordRequestSchema)
}
