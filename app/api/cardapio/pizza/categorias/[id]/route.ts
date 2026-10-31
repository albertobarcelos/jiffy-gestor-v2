import { NextRequest, NextResponse } from 'next/server'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  AtualizarPizzaCategoriaUseCase,
  BuscarPizzaCategoriaUseCase,
  ExcluirPizzaCategoriaUseCase,
} from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
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
    const categoria = await new BuscarPizzaCategoriaUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

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

    const categoria = await new AtualizarPizzaCategoriaUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id, parsed.data)

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
    await new ExcluirPizzaCategoriaUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao excluir categoria de pizza')
  }
}