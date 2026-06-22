import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/delivery/clientes/[telefone]
 * Proxy para GET /api/v1/delivery/clientes/{telefone}.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ telefone: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { telefone } = await params
    if (!telefone?.trim()) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/clientes/${encodeURIComponent(telefone)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return NextResponse.json({ error: 'Cliente delivery não encontrado' }, { status: 404 })
    }
    console.error('Erro ao buscar cliente delivery:', error)
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return NextResponse.json({ error: mensagemLegivelApiError(error) }, { status: 404 })
      }
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/delivery/clientes/[telefone]
 * Proxy para PATCH /api/v1/delivery/clientes/{telefone} (enderecos create/update/delete).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ telefone: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { telefone } = await params
    if (!telefone?.trim()) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/clientes/${encodeURIComponent(telefone)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    console.error('Erro ao atualizar cliente delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
