import { NextRequest, NextResponse } from 'next/server'
import type { UpdateGrupoMassasPizzaInput } from '@/src/domain/repositories/IPizzaRepository'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  AtualizarPizzaGrupoMassasUseCase,
  BuscarPizzaGrupoMassasUseCase,
  ExcluirPizzaGrupoMassasUseCase,
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

/** GET /api/cardapio/pizza/grupo-massas/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const grupo = await new BuscarPizzaGrupoMassasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

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

    const grupo = await new AtualizarPizzaGrupoMassasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id, validated.data as UpdateGrupoMassasPizzaInput)

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
    await new ExcluirPizzaGrupoMassasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao excluir grupo de massas')
  }
}