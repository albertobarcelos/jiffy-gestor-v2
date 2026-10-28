import { NextRequest, NextResponse } from 'next/server'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  CriarPizzaComplementoUseCase,
  ListarPizzaComplementosUseCase,
} from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
import { createPizzaComplementoSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  pizzaApiErrorResponse,
  pizzaJsonData,
} from '@/src/shared/utils/pizzaApiRoute'

/** GET /api/cardapio/pizza/complementos?categoriaPizzaId=... */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const categoriaPizzaId = new URL(req.url).searchParams.get('categoriaPizzaId')
    if (!categoriaPizzaId) {
      return NextResponse.json(
        { message: 'categoriaPizzaId é obrigatório' },
        { status: 400 }
      )
    }

    const complementos = await new ListarPizzaComplementosUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(categoriaPizzaId)

    return pizzaJsonData(complementos)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao listar adicionais da pizza')
  }
}

/** POST /api/cardapio/pizza/complementos */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await req.json()
    const parsed = createPizzaComplementoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    const complemento = await new CriarPizzaComplementoUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(parsed.data)

    return pizzaJsonData(complemento, 201)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao vincular adicional à categoria')
  }
}
