import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { lerIntervaloFinalizacaoVendasPdv } from '@/src/shared/utils/parametrosDataFinalizacaoVendasPdv'
import {
  Status,
  obterFusoAgregacaoDaEmpresaLogada,
  fetchEvolucaoPoints,
} from './evolucaoService'

/**
 * GET /api/dashboard/evolucao
 *
 * Retorna pontos já agregados para o gráfico, evitando múltiplos fetches e agregação no client.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const intervaloDatas = lerIntervaloFinalizacaoVendasPdv(searchParams)
    const periodoInicial = intervaloDatas?.inicial ?? ''
    const periodoFinal = intervaloDatas?.final ?? ''
    const statuses = searchParams.getAll('status').filter(Boolean) as Status[]
    const intervaloHoraRaw = searchParams.get('intervaloHora')
    const intervaloHora = intervaloHoraRaw ? Number(intervaloHoraRaw) : null

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const selectedStatuses: Status[] =
      statuses.length > 0
        ? statuses.filter(s => s === 'FINALIZADA' || s === 'CANCELADA')
        : ['FINALIZADA']

    const fusoAgregacao = await obterFusoAgregacaoDaEmpresaLogada(apiClient, headers)

    const points = await fetchEvolucaoPoints({
      apiClient,
      headers,
      periodoInicial,
      periodoFinal,
      selectedStatuses,
      intervaloHora,
      fusoAgregacao,
    })

    return NextResponse.json(points)
  } catch (error) {
    console.error('Erro ao buscar evolução do dashboard:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar evolução do dashboard' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
