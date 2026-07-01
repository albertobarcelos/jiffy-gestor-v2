import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/usuarios-pdv/entregadores
 * Lista usuários PDV ativos marcados como entregadores para seleção na venda gestor.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'

    const params = new URLSearchParams({
      limit,
      offset,
      ativo: 'true',
      tipoUsuarioPdv: 'entregador',
    })

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/pessoas/usuarios-pdv?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    const data = response.data as { items?: unknown[]; count?: number } | unknown[] | null | undefined
    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
    const entregadores = items.filter((item: unknown) => {
      const raw = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      const tipo = String(raw.tipoUsuarioPdv ?? '')
        .trim()
        .toLowerCase()
      return tipo === 'entregador'
    })

    return NextResponse.json({
      items: entregadores,
      count: entregadores.length,
    })
  } catch (error) {
    console.error('Erro ao buscar entregadores PDV:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar entregadores', details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
