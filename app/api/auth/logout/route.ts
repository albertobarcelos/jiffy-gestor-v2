import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route para logout
 * POST /api/auth/logout
 * Remove o cookie de autenticação do servidor
 */
export async function POST() {
  try {
    // Cria resposta de sucesso
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout realizado com sucesso',
      },
      { status: 200 }
    )

    // Remove o cookie de autenticação
    response.cookies.delete('auth-token')
    
    // Garante que o cookie seja removido com todas as configurações
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Expira imediatamente
    })

    return response
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao fazer logout',
      },
      { status: 500 }
    )
  }
}

