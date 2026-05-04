import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { AtualizarTaxaSchema } from '@/src/application/dto/AtualizarTaxaDTO'
import { TaxaRepository } from '@/src/infrastructure/database/repositories/TaxaRepository'
import { BuscarTaxaPorIdUseCase } from '@/src/application/use-cases/taxas/BuscarTaxaPorIdUseCase'
import { AtualizarTaxaUseCase } from '@/src/application/use-cases/taxas/AtualizarTaxaUseCase'
import { ExcluirTaxaUseCase } from '@/src/application/use-cases/taxas/ExcluirTaxaUseCase'
import { ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/taxas/:id
 * Detalhe da taxa com `terminaisConfig` (repassa GET /api/v1/taxas/:id).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(_request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { id } = await context.params

    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const repository = new TaxaRepository(undefined, tokenInfo.token)
    const useCase = new BuscarTaxaPorIdUseCase(repository)
    const result = await useCase.execute(id.trim())

    return NextResponse.json({
      ...result.taxa.toJSON(),
      terminaisConfig: result.terminaisConfig,
    })
  } catch (error) {
    console.error('Erro ao buscar taxa:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar taxa' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/taxas/:id
 * Atualiza taxa e opcionalmente `terminaisConfig`.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { id } = await context.params

    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as unknown
    const payload = AtualizarTaxaSchema.parse(body)

    const repository = new TaxaRepository(undefined, tokenInfo.token)
    const useCase = new AtualizarTaxaUseCase(repository)
    const taxa = await useCase.execute(id.trim(), payload)

    return NextResponse.json(taxa.toJSON())
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar taxa:', error)
    if (error instanceof ApiError) {
      const status =
        error.status >= 400 && error.status < 600 ? error.status : 502
      return NextResponse.json(
        {
          error: mensagemLegivelApiError(error),
          details: error.data,
        },
        { status }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar taxa' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/taxas/:id
 * Exclusão lógica no microserviço fiscal (204 sem corpo).
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { id } = await context.params

    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const repository = new TaxaRepository(undefined, tokenInfo.token)
    const useCase = new ExcluirTaxaUseCase(repository)
    await useCase.execute(id.trim())

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Erro ao excluir taxa:', error)
    if (error instanceof ApiError) {
      const status =
        error.status >= 400 && error.status < 600 ? error.status : 502
      return NextResponse.json(
        {
          error: mensagemLegivelApiError(error),
          details: error.data,
        },
        { status }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir taxa' },
      { status: 500 }
    )
  }
}
