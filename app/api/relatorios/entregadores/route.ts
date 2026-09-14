import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import { RelatorioEntregadoresFonteRepository } from '@/src/infrastructure/relatorios/RelatorioEntregadoresFonteRepository'
import { ListarRelatorioEntregadoresUseCase } from '@/src/application/use-cases/relatorios/ListarRelatorioEntregadoresUseCase'
import {
  OrderByDirectionRelatorioEntregadoresSchema,
  OrderByFieldRelatorioEntregadoresSchema,
  RelatorioEntregadoresFiltroError,
} from '@/src/application/dto/RelatorioEntregadoresDTO'

function numeroQuery(raw: string | null, fallback: number): number {
  if (raw == null || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/**
 * GET /api/relatorios/entregadores
 * Relatório de taxas de cobertura por entregador (pedidos finalizados).
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { searchParams } = new URL(request.url)
    const useCase = new ListarRelatorioEntregadoresUseCase(
      new RelatorioEntregadoresFonteRepository()
    )

    const orderFieldRaw = searchParams.get('orderByField')
    const orderDirRaw = searchParams.get('orderByDirection')
    const orderFieldParsed = orderFieldRaw
      ? OrderByFieldRelatorioEntregadoresSchema.safeParse(orderFieldRaw)
      : null
    const orderDirParsed = orderDirRaw
      ? OrderByDirectionRelatorioEntregadoresSchema.safeParse(orderDirRaw)
      : null
    if (orderFieldParsed && !orderFieldParsed.success) {
      return NextResponse.json({ error: 'orderByField inválido' }, { status: 400 })
    }
    if (orderDirParsed && !orderDirParsed.success) {
      return NextResponse.json({ error: 'orderByDirection inválido' }, { status: 400 })
    }
    const orderByField = orderFieldParsed?.success ? orderFieldParsed.data : undefined
    const orderByDirection = orderDirParsed?.success ? orderDirParsed.data : undefined

    const result = await useCase.execute({
      token: validation.tokenInfo.token,
      filtro: {
        dataFinalizacaoInicio: searchParams.get('dataFinalizacaoInicio') ?? '',
        dataFinalizacaoFim: searchParams.get('dataFinalizacaoFim') ?? '',
        q: searchParams.get('q') ?? undefined,
        entregadorId: searchParams.get('entregadorId') ?? undefined,
        coberturaId: searchParams.get('coberturaId') ?? undefined,
        orderByField,
        orderByDirection,
        offset: numeroQuery(searchParams.get('offset'), 0),
        limit: numeroQuery(searchParams.get('limit'), 10),
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof RelatorioEntregadoresFiltroError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      )
    }
    console.error('Erro ao montar relatório de entregadores:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar relatório' },
      { status: 500 }
    )
  }
}
