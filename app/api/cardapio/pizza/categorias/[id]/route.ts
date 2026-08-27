import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { PizzaRepository } from '@/src/infrastructure/database/repositories/PizzaRepository'
import { updateCategoriaPizzaSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  pizzaApiErrorResponse,
  pizzaJsonData,
  pizzaJsonOk,
} from '@/src/shared/utils/pizzaApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/cardapio/pizza/categorias/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const categoria = await repo.buscarCategoriaPorId(id)

    return pizzaJsonData(categoria)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao buscar categoria de pizza')
  }
}

/** PATCH /api/cardapio/pizza/categorias/:id */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const parsed = updateCategoriaPizzaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const categoria = await repo.atualizarCategoria(id, parsed.data)

    return pizzaJsonData(categoria)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao atualizar categoria de pizza')
  }
}

/** DELETE /api/cardapio/pizza/categorias/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    await repo.excluirCategoria(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao excluir categoria de pizza')
  }
}