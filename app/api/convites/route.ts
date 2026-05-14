import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  CriarConviteGestaoRequestSchema,
  ListarConvitesGestaoResponseSchema,
  ConviteGestaoSchema,
  unwrapListaConvitesGestaoResponse,
} from '@/src/application/dto/convites/ConvitesGestaoDTO'
import { ZodError } from 'zod'

/**
 * BFF: Lista / cria convites da empresa autenticada (contexto gestor).
 * GET|POST /api/convites → API externa /api/v1/convites
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/convites', {
      method: 'GET',
      headers: { Authorization: `Bearer ${validation.tokenInfo.token}` },
    })

    const unwrapped = unwrapListaConvitesGestaoResponse(response.data)
    const parsed = ListarConvitesGestaoResponseSchema.parse(unwrapped)
    return NextResponse.json(parsed, { status: 200 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message || 'Erro ao listar convites' }, { status: error.status })
    }
    if (error instanceof ZodError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[GET /api/convites] Zod:', error.flatten(), error.issues)
      }
      return NextResponse.json({ error: 'Resposta inválida do servidor' }, { status: 502 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const body = await request.json()
    const payload = CriarConviteGestaoRequestSchema.parse(body)

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/convites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const parsed = ConviteGestaoSchema.parse(response.data)
    const ok =
      response.status === 201 || response.status === 200 ? response.status : 201
    return NextResponse.json(parsed, { status: ok })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message || 'Erro ao criar convite' }, { status: error.status })
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Dados inválidos ou resposta inválida' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
