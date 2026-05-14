import { NextRequest, NextResponse } from 'next/server'
import { LoginSchema } from '@/src/application/dto/LoginDTO'
import { LoginUseCase } from '@/src/application/use-cases/auth/LoginUseCase'
import { AuthRepository } from '@/src/infrastructure/database/repositories/AuthRepository'
import {
  AUTH_COOKIE_IDENTITY,
  AUTH_COOKIE_TENANT,
  AUTH_COOKIE_REFRESH,
  AUTH_COOKIE_LEGACY,
  clearAuthCookie,
  cookieOptsMaxAge,
} from '@/src/shared/utils/authCookies'

/**
 * API Route para login
 * POST /api/auth/login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validação dos dados
    const validatedData = LoginSchema.parse(body)

    // Cria instâncias (em produção, usar injeção de dependência)
    const authRepository = new AuthRepository()
    const loginUseCase = new LoginUseCase(authRepository)

    // Executa o caso de uso
    const { auth, empresas } = await loginUseCase.execute(validatedData)

    // Retorna resposta com token e, quando existir, empresas do login multi-empresa
    const response = NextResponse.json(
      {
        success: true,
        data: {
          ...auth.toJSON(),
          ...(empresas && empresas.length > 0 ? { empresas } : {}),
        },
      },
      { status: 200 }
    )

    const expiresAt = auth.getExpiresAt()
    const maxAge = expiresAt
      ? Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 60)
      : 60 * 60 * 24

    response.cookies.set(AUTH_COOKIE_IDENTITY, auth.getAccessToken(), cookieOptsMaxAge(maxAge))
    clearAuthCookie(response, AUTH_COOKIE_TENANT)
    clearAuthCookie(response, AUTH_COOKIE_REFRESH)
    clearAuthCookie(response, AUTH_COOKIE_LEGACY)

    return response
  } catch (error) {
    if (error instanceof Error) {
      // Erro de validação Zod
      if (error.name === 'ZodError') {
        return NextResponse.json(
          {
            success: false,
            error: 'Dados inválidos',
            details: error.message,
          },
          { status: 400 }
        )
      }

      // Outros erros
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Erro ao realizar login',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

