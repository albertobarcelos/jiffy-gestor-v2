import { NextRequest, NextResponse } from 'next/server'
import type { CreateGrupoMassasPizzaInput } from '@/src/domain/repositories/IPizzaRepository'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  CriarPizzaGrupoMassasUseCase,
  ListarPizzaGruposMassasUseCase,
} from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  parsePizzaPagination,
  pizzaApiErrorResponse,
  pizzaJsonData,
  pizzaJsonPaginated,
} from '@/src/shared/utils/pizzaApiRoute'

function validateGrupoBody(
  body: unknown,
  options: { requireNome?: boolean }
): { ok: true; data: Record<string, unknown> } | { ok: false; response: NextResponse } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Corpo invalido' }, { status: 400 }),
    }
  }

  const data = body as Record<string, unknown>

  if (options.requireNome) {
    if (!data.nome || typeof data.nome !== 'string') {
      return {
        ok: false,
        response: NextResponse.json({ message: 'Nome e obrigatorio' }, { status: 400 }),
      }
    }
  } else if (data.nome !== undefined && typeof data.nome !== 'string') {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Nome invalido' }, { status: 400 }),
    }
  }

  return { ok: true, data }
}

/** GET /api/cardapio/pizza/grupo-massas */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { searchParams } = new URL(req.url)
    const pagination = parsePizzaPagination(searchParams)
    const categoriaPizzaId = searchParams.get('categoriaPizzaId') || undefined

    const result = await new ListarPizzaGruposMassasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute({ ...pagination, categoriaPizzaId })

    return pizzaJsonPaginated(result)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao listar grupos de massas')
  }
}

/** POST /api/cardapio/pizza/grupo-massas */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await req.json()
    const validated = validateGrupoBody(body, { requireNome: false })
    if (!validated.ok) return validated.response

    const grupo = await new CriarPizzaGrupoMassasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(validated.data as unknown as CreateGrupoMassasPizzaInput)

    return pizzaJsonData(grupo, 201)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao criar grupo de massas')
  }
}