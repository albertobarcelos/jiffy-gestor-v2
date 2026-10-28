import { NextRequest, NextResponse } from 'next/server'
import type { UpdateGrupoBordasPizzaInput } from '@/src/domain/repositories/IPizzaRepository'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  AtualizarPizzaGrupoBordasUseCase,
  BuscarPizzaGrupoBordasUseCase,
  ExcluirPizzaGrupoBordasUseCase,
} from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
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

/** GET /api/cardapio/pizza/grupo-bordas/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const grupo = await new BuscarPizzaGrupoBordasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

    return pizzaJsonData(grupo)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao buscar grupo de bordas')
  }
}

/** PATCH /api/cardapio/pizza/grupo-bordas/:id */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const validated = validateGrupoPatchBody(body)
    if (!validated.ok) return validated.response

    const grupo = await new AtualizarPizzaGrupoBordasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id, validated.data as UpdateGrupoBordasPizzaInput)

    return pizzaJsonData(grupo)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao atualizar grupo de bordas')
  }
}

/** DELETE /api/cardapio/pizza/grupo-bordas/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    await new ExcluirPizzaGrupoBordasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao excluir grupo de bordas')
  }
}