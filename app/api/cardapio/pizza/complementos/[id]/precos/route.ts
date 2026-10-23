import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { PizzaRepository } from '@/src/infrastructure/database/repositories/PizzaRepository'
import { replacePizzaComplementoPrecosSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  pizzaApiErrorResponse,
  pizzaJsonData,
} from '@/src/shared/utils/pizzaApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** PUT /api/cardapio/pizza/complementos/:id/precos */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    if (!id) {
      return NextResponse.json({ message: 'Id obrigatório' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = replacePizzaComplementoPrecosSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const complemento = await repo.substituirPrecosComplementoPizza(id, parsed.data)

    return pizzaJsonData(complemento)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao atualizar preços do adicional')
  }
}
