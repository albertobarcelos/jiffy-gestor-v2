import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { PizzaRepository } from '@/src/infrastructure/database/repositories/PizzaRepository'
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

/** GET /api/cardapio/pizza/grupo-bordas */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { searchParams } = new URL(req.url)
    const pagination = parsePizzaPagination(searchParams)
    const categoriaPizzaId = searchParams.get('categoriaPizzaId') || undefined

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const result = await repo.listarGruposBordas({ ...pagination, categoriaPizzaId })

    return pizzaJsonPaginated(result)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao listar grupos de bordas')
  }
}

/** POST /api/cardapio/pizza/grupo-bordas */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await req.json()
    const validated = validateGrupoBody(body, { requireNome: false })
    if (!validated.ok) return validated.response

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const grupo = await repo.criarGrupoBordas(validated.data)

    return pizzaJsonData(grupo, 201)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao criar grupo de bordas')
  }
}