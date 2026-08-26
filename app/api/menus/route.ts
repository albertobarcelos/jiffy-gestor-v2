import { NextRequest, NextResponse } from 'next/server'
import {
  CreateMenuBodySchema,
  ListarMenusQuerySchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import {
  CriarMenuUseCase,
  ListarMenusUseCase,
} from '@/src/application/use-cases/menus/menuCadastroUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import {
  menuZodErrorResponse,
  parseMenuRouteInput,
  searchParamsToRecord,
} from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

/** GET /api/menus — lista menus da empresa */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { searchParams } = new URL(req.url)
    const query = parseMenuRouteInput(ListarMenusQuerySchema, searchParamsToRecord(searchParams))
    const q = query.q || query.name || undefined

    const useCase = new ListarMenusUseCase(createMenuRepository(validation.tokenInfo.token))
    const result = await useCase.execute({
      q,
      limit: query.limit,
      offset: query.offset,
      ativo: query.ativo,
      tipo: query.tipo,
    })

    return NextResponse.json(
      { success: true, ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao listar menus')
  }
}

/** POST /api/menus — cria menu custom */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = parseMenuRouteInput(CreateMenuBodySchema, await req.json())
    const useCase = new CriarMenuUseCase(createMenuRepository(validation.tokenInfo.token))
    const menu = await useCase.execute({
      nome: body.nome,
      descricao: body.descricao ?? null,
      codigo: body.codigo,
      tipo: 'custom',
    })

    return NextResponse.json({ success: true, data: menu }, { status: 201 })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao criar menu')
  }
}
