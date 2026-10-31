import { NextRequest, NextResponse } from 'next/server'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  AtualizarPizzaTamanhoUseCase,
  BuscarPizzaTamanhoUseCase,
  ExcluirPizzaTamanhoUseCase,
} from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
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
    const tamanho = await new BuscarPizzaTamanhoUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

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

    const tamanho = await new AtualizarPizzaTamanhoUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id, parsed.data)

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
    await new ExcluirPizzaTamanhoUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao excluir tamanho de pizza')
  }
}