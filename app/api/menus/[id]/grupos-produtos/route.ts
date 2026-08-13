import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { MenuRepository } from '@/src/infrastructure/database/repositories/MenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

function parseOptionalBool(value: string | null): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

/** GET /api/menus/:id/grupos-produtos — snapshots MenuGrupoProduto */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const { searchParams } = new URL(req.url)

    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const result = await repo.listarGrupos(id, {
      q: searchParams.get('q') || undefined,
      limit: parseInt(searchParams.get('limit') || '100', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      ativo: parseOptionalBool(searchParams.get('ativo')),
      grupoProdutoId: searchParams.get('grupoProdutoId') || undefined,
    })

    return NextResponse.json(
      { success: true, ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao listar grupos do menu')
  }
}
