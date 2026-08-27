import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { PizzaRepository } from '@/src/infrastructure/database/repositories/PizzaRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  pizzaApiErrorResponse,
  pizzaJsonData,
  pizzaJsonOk,
} from '@/src/shared/utils/pizzaApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

function validateGrupoPatchBody(
  body: unknown
): { ok: true; data: Record<string, unknown> } | { ok: false; response: NextResponse } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Corpo invalido' }, { status: 400 }),
    }
  }

  const data = body as Record<string, unknown>
  if (data.nome !== undefined && typeof data.nome !== 'string') {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Nome invalido' }, { status: 400 }),
    }
  }

  return { ok: true, data }
}

/** GET /api/cardapio/pizza/grupo-massas/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const grupo = await repo.buscarGrupoMassasPorId(id)

    return pizzaJsonData(grupo)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao buscar grupo de massas')
  }
}

/** PATCH /api/cardapio/pizza/grupo-massas/:id */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const validated = validateGrupoPatchBody(body)
    if (!validated.ok) return validated.response

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const grupo = await repo.atualizarGrupoMassas(id, validated.data)

    return pizzaJsonData(grupo)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao atualizar grupo de massas')
  }
}

/** DELETE /api/cardapio/pizza/grupo-massas/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    await repo.excluirGrupoMassas(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao excluir grupo de massas')
  }
}