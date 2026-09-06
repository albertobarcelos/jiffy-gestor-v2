import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>('/api/v1/empresas/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    const payload = response.data
    if (payload && typeof payload === 'object') {
      const p = payload as Record<string, unknown>
      const responseEmpresaId = p.id != null ? String(p.id) : null
      // Anti-mix: backend/cache não pode devolver outra empresa que a do Bearer.
      if (
        responseEmpresaId &&
        tokenInfo.empresaId &&
        responseEmpresaId !== tokenInfo.empresaId
      ) {
        console.error('[api/empresas/me] empresa da resposta ≠ token', {
          tokenEmpresaId: tokenInfo.empresaId,
          responseEmpresaId,
        })
        return NextResponse.json(
          { error: 'Resposta de empresa incompatível com a sessão da aba' },
          { status: 409 }
        )
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[api/empresas/me] parametroEmpresa (timezone API):', p.parametroEmpresa)
      }
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar empresa' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/empresas/me
 * Atualiza a empresa da sessão (mesmo contrato de PATCH /api/empresas/[id]).
 */
export async function PATCH(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    if (!tokenInfo.empresaId) {
      return NextResponse.json({ error: 'Empresa da sessão não encontrada' }, { status: 400 })
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/empresas/${tokenInfo.empresaId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar empresa' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
