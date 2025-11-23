import { NextRequest, NextResponse } from 'next/server'
import { LoginSchema } from '@/src/application/dto/LoginDTO'
import { LoginUseCase } from '@/src/application/use-cases/auth/LoginUseCase'
import { AuthRepository } from '@/src/infrastructure/database/repositories/AuthRepository'

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
    const auth = await loginUseCase.execute(validatedData)

    // Retorna resposta com token
    const response = NextResponse.json(
      {
        success: true,
        data: auth.toJSON(),
      },
      { status: 200 }
    )

    // Define cookie com o token com configurações de segurança
    response.cookies.set('auth-token', auth.getAccessToken(), {
      httpOnly: true, // Previne acesso via JavaScript
      secure: process.env.NODE_ENV === 'production', // Apenas HTTPS em produção
      sameSite: 'strict', // Proteção CSRF mais rigorosa
      path: '/', // Aplicar a todo o site
      maxAge: 60 * 60 * 24, // 24 horas
    })

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

