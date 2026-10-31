import { NextRequest, NextResponse } from 'next/server'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  CriarPizzaTamanhoUseCase,
  ListarPizzaTamanhosUseCase,
} from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
import { createPizzaTamanhoSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  parsePizzaPagination,
  pizzaApiErrorResponse,
  pizzaJsonData,
  pizzaJsonPaginated,
} from '@/src/shared/utils/pizzaApiRoute'

/** GET /api/cardapio/pizza/tamanhos */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { searchParams } = new URL(req.url)
    const pagination = parsePizzaPagination(searchParams)
    const categoriaPizzaId = searchParams.get('categoriaPizzaId') || undefined

    const result = await new ListarPizzaTamanhosUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute({ ...pagination, categoriaPizzaId })

    return pizzaJsonPaginated(result)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao listar tamanhos de pizza')
  }
}

/** POST /api/cardapio/pizza/tamanhos */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await req.json()
    const parsed = createPizzaTamanhoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const tamanho = await new CriarPizzaTamanhoUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(parsed.data)

    return pizzaJsonData(tamanho, 201)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao criar tamanho de pizza')
  }
}