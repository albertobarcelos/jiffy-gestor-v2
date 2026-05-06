import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { getAuthToken } from '@/src/shared/utils/getAuthToken'
import {
  EscolherEmpresaRequestSchema,
  EscolherEmpresaResponseSchema,
} from '@/src/application/dto/auth/EscolherEmpresaDTO'

/**
 * BFF: Abre sessão na empresa selecionada (multi-empresa)
 * POST /api/auth/escolher-empresa
 */
export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 })
    }

    const body = await request.json()
    const validated = EscolherEmpresaRequestSchema.parse(body)

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/auth/escolher-empresa', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(validated),
    })

    const parsed = EscolherEmpresaResponseSchema.parse(response.data)

    // Cookie httpOnly = token da empresa (tenant); priorizado em getAuthToken sobre o header.
    const res = NextResponse.json(parsed, { status: 200 })
    res.cookies.set('auth-token', parsed.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    return res
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message || 'Erro ao escolher empresa' }, { status: error.status })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

