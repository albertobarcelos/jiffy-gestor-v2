import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { PizzaRepository } from '@/src/infrastructure/database/repositories/PizzaRepository'
import { updatePizzaTamanhoSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  pizzaApiErrorResponse,
  pizzaJsonData,
  pizzaJsonOk,
} from '@/src/shared/utils/pizzaApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/cardapio/pizza/tamanhos/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const tamanho = await repo.buscarTamanhoPorId(id)

    return pizzaJsonData(tamanho)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao buscar tamanho de pizza')
  }
}

/** PATCH /api/cardapio/pizza/tamanhos/:id */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const parsed = updatePizzaTamanhoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const tamanho = await repo.atualizarTamanho(id, parsed.data)

    return pizzaJsonData(tamanho)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao atualizar tamanho de pizza')
  }
}

/** DELETE /api/cardapio/pizza/tamanhos/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    await repo.excluirTamanho(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao excluir tamanho de pizza')
  }
}