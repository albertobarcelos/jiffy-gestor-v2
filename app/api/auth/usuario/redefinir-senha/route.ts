import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { RedefinirSenhaBodySchema } from '@/src/application/dto/auth/UsuarioAuthDTO'
import { AUTH_USUARIO_REDEFINIR_SENHA } from '@/src/shared/constants/authUsuarioApiPaths'
import {
  extrairBearerAuthorization,
  proxyAuthUsuarioBearerPost,
} from '../_shared/proxyAuthUsuarioBearerPost'

/**
 * POST /api/auth/usuario/redefinir-senha
 * Token no header Authorization: Bearer; corpo só `{ "password": "..." }`.
 */
export async function POST(request: NextRequest) {
  const token = extrairBearerAuthorization(request.headers.get('authorization'))
  if (!token) {
    return NextResponse.json(
      { error: 'Token ausente. Envie o cabeçalho Authorization: Bearer com o token do e-mail.' },
      { status: 400 }
    )
  }

  try {
    const raw: unknown = await request.json()
    const body = RedefinirSenhaBodySchema.parse(raw)
    return proxyAuthUsuarioBearerPost(AUTH_USUARIO_REDEFINIR_SENHA, token, body)
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0]?.message
      return NextResponse.json({ error: first || 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }
}
