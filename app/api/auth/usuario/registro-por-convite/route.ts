import { NextRequest } from 'next/server'
import { RegistroPorConviteRequestSchema } from '@/src/application/dto/auth/UsuarioAuthDTO'
import { AUTH_USUARIO_REGISTRO_POR_CONVITE } from '@/src/shared/constants/authUsuarioApiPaths'
import { proxyAuthUsuarioPost } from '../_shared/proxyAuthUsuarioPost'

/** POST /api/auth/usuario/registro-por-convite → upstream registro por convite (conviteId obrigatório). */
export async function POST(request: NextRequest) {
  return proxyAuthUsuarioPost(request, AUTH_USUARIO_REGISTRO_POR_CONVITE, RegistroPorConviteRequestSchema)
}
