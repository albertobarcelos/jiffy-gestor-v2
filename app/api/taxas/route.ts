import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { CriarTaxaSchema } from '@/src/application/dto/CriarTaxaDTO'
import { TaxaRepository } from '@/src/infrastructure/database/repositories/TaxaRepository'
import { BuscarTaxasUseCase } from '@/src/application/use-cases/taxas/BuscarTaxasUseCase'
import { CriarTaxaUseCase } from '@/src/application/use-cases/taxas/CriarTaxaUseCase'
import { ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/taxas
 * Lista taxas da empresa com paginação e busca (repassa ao microserviço fiscal).
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const q = searchParams.get('q') || ''

    const repository = new TaxaRepository(undefined, tokenInfo.token)
    const useCase = new BuscarTaxasUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
    })

    return NextResponse.json({
      items: result.taxas.map(t => t.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar taxas:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar taxas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/taxas
 * Cria taxa (repassa ao backend: POST /api/v1/taxas).
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = (await request.json().catch(() => ({}))) as unknown
    const payload = CriarTaxaSchema.parse(body)

    const repository = new TaxaRepository(undefined, tokenInfo.token)
    const useCase = new CriarTaxaUseCase(repository)
    const taxa = await useCase.execute(payload)

    return NextResponse.json(taxa.toJSON(), { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Erro ao criar taxa:', error)
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
      { error: error instanceof Error ? error.message : 'Erro ao criar taxa' },
      { status: 500 }
    )
  }
}
