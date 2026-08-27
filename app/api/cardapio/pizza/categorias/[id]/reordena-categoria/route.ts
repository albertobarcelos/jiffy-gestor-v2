import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { PizzaRepository } from '@/src/infrastructure/database/repositories/PizzaRepository'
import { reorderCategoriaPizzaSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { pizzaApiErrorResponse, pizzaJsonData } from '@/src/shared/utils/pizzaApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/cardapio/pizza/categorias/:id/reordena-categoria */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const parsed = reorderCategoriaPizzaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const categoria = await repo.reordenarCategoria(id, parsed.data.novaPosicao)

    return pizzaJsonData(categoria)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao reordenar categoria de pizza')
  }
}