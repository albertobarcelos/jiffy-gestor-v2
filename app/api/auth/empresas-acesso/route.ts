import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { PAGE_SIZE_EMPRESAS_FLOW } from '@/src/presentation/gestor-pedidos/kiosk/filtrarEmpresasFlow'
import { isLikelyHubSessionTokenError } from '@/src/presentation/components/features/minhas-empresas/utils/hubSessionTokenFeedback'
import { parsePaginaEmpresasAcesso } from '@/src/presentation/gestor-pedidos/kiosk/empresasAcessoApi'

/**
 * Lista empresas do utilizador autenticado (identity ou access), com página e busca.
 * Proxy de `GET /api/v1/empresas?offset&limit&q` — fora do POST login.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request, { requireEmpresaId: false })
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { searchParams } = new URL(request.url)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
    const rawLimit = parseInt(searchParams.get('limit') || String(PAGE_SIZE_EMPRESAS_FLOW), 10)
    const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : PAGE_SIZE_EMPRESAS_FLOW))
    const q = (searchParams.get('q') || '').trim()

    const qs = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    })
    if (q) qs.set('q', q)

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(`/api/v1/empresas?${qs}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${validation.tokenInfo.token}` },
    })

    const pagina = parsePaginaEmpresasAcesso({
      ...(response.data && typeof response.data === 'object' ? response.data : {}),
      offset,
    })
    return NextResponse.json(pagina)
  } catch (error) {
    if (error instanceof ApiError) {
      const message = error.message || 'Não foi possível listar as empresas'
      if (error.status === 401 && !isLikelyHubSessionTokenError(message)) {
        return NextResponse.json({ message }, { status: 403 })
      }
      return NextResponse.json({ message }, { status: error.status })
    }
    console.error('[empresas-acesso]', error)
    return NextResponse.json({ message: 'Não foi possível listar as empresas' }, { status: 500 })
  }
}
