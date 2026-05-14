import { NextRequest } from 'next/server'
import { CreateUsuarioRequestSchema } from '@/src/application/dto/auth/UsuarioAuthDTO'
import { AUTH_USUARIO_REGISTRO } from '@/src/shared/constants/authUsuarioApiPaths'
import { proxyAuthUsuarioPost } from '../_shared/proxyAuthUsuarioPost'

/** POST /api/auth/usuario/registro → upstream POST /api/v1/auth/usuario/registro */
export async function POST(request: NextRequest) {
  return proxyAuthUsuarioPost(request, AUTH_USUARIO_REGISTRO, CreateUsuarioRequestSchema)
}
