import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import {
  clampIntRelatorio,
  normalizeBuscaRelatorio,
  parseOptionalNumberRelatorio,
} from '@/src/infrastructure/relatorios/montarRelatorioProdutosVendidos'
import { consultarRelatorioProdutosVendidosMvpUseCase } from '@/src/infrastructure/composition/relatorioProdutosVendidosMvpUseCases'
import type { RelatorioComplementoImpacto } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'

function parseImpactoComplementoQuery(
  raw: string | null
): RelatorioComplementoImpacto | 'todos' {
  if (raw === 'aumenta' || raw === 'diminui' || raw === 'nenhum') return raw
  return 'todos'
}

/**
 * GET /api/relatorios/produtos-vendidos/mvp
 *
 * HTTP: parse + auth + resposta.
 * Orquestração: ConsultarRelatorioProdutosVendidosMvpUseCase.
 *
 * Performance:
 * - Agregação cacheada ~90s por empresa + filtros.
 * - Carga principal: só período atual (`comparativo=0` na 1ª página).
 * - `somenteComparativo=1`: período anterior em 2ª requisição (usa cache do atual).
 * - `somenteParticipacao=1` / `somenteParticipacaoAbc=1` / `somenteSerie=1` / `somenteComplementos=1`: blocos SPA sob demanda.
 * - `participacao=0` / `serie=0` na carga base: lista leve sem gráficos.
 * - `somentePagina=1` + `offset>0`: paginação em memória.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const validation = validateRequest(request, { requireEmpresaId: true })
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }
  const { tokenInfo } = validation
  const empresaId = tokenInfo.empresaId!

  try {
    const body = await consultarRelatorioProdutosVendidosMvpUseCase.execute({
      empresaId,
      token: tokenInfo.token,
      periodo: searchParams.get('periodo') || 'hoje',
      timezone: searchParams.get('timezone') || 'America/Sao_Paulo',
      sortRaw: searchParams.get('sort') || 'quantidade_desc',
      incluirSerie: searchParams.get('serie') === '1',
      incluirParticipacao: searchParams.get('participacao') === '1',
      somentePagina: searchParams.get('somentePagina') === '1',
      somenteComparativo: searchParams.get('somenteComparativo') === '1',
      somenteParticipacao: searchParams.get('somenteParticipacao') === '1',
      somenteParticipacaoAbc: searchParams.get('somenteParticipacaoAbc') === '1',
      somenteSerie: searchParams.get('somenteSerie') === '1',
      somenteComplementos: searchParams.get('somenteComplementos') === '1',
      impactoComplemento: parseImpactoComplementoQuery(searchParams.get('impactoComplemento')),
      grupoIdsParam: searchParams.get('grupoIds')?.trim() ?? '',
      grupoComplementoIdsParam: searchParams.get('grupoComplementoIds')?.trim() ?? '',
      valorMin: parseOptionalNumberRelatorio(searchParams.get('valorMin')),
      valorMax: parseOptionalNumberRelatorio(searchParams.get('valorMax')),
      qtdMin: parseOptionalNumberRelatorio(searchParams.get('qtdMin')),
      qtdMax: parseOptionalNumberRelatorio(searchParams.get('qtdMax')),
      qBusca: normalizeBuscaRelatorio(searchParams.get('q')),
      limit: clampIntRelatorio(searchParams.get('limit'), 50, 1, 200),
      offset: clampIntRelatorio(searchParams.get('offset'), 0, 0, 50_000),
      searchParams,
    })

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (error) {
    console.error('Erro em /api/relatorios/produtos-vendidos/mvp:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao montar relatório MVP de produtos vendidos.' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno ao montar relatório MVP de produtos vendidos.' },
      { status: 500 }
    )
  }
}
