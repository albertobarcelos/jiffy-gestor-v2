import { NextRequest, NextResponse } from 'next/server'
import {
  CriarMenuUseCase,
  ListarMenusUseCase,
} from '@/src/application/use-cases/menus/menuCadastroUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

/** GET /api/menus — lista menus da empresa */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || searchParams.get('name') || undefined
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const tipo = searchParams.get('tipo') || undefined
    const ativoParam = searchParams.get('ativo')
    const ativo =
      ativoParam === 'true' ? true : ativoParam === 'false' ? false : null

    const useCase = new ListarMenusUseCase(createMenuRepository(validation.tokenInfo.token))
    const result = await useCase.execute({ q, limit, offset, ativo, tipo })

    return NextResponse.json(
      { success: true, ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao listar menus')
  }
}

/** POST /api/menus — cria menu custom */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await req.json()
    const useCase = new CriarMenuUseCase(createMenuRepository(validation.tokenInfo.token))
    const menu = await useCase.execute({
      nome: body.nome,
      descricao: body.descricao ?? null,
      codigo: body.codigo,
      tipo: 'custom',
    })

    return NextResponse.json({ success: true, data: menu }, { status: 201 })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao criar menu')
  }
}
