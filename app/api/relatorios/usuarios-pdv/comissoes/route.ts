import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  OrderByDirectionComissoesSchema,
  OrderByFieldComissoesSchema,
} from '@/src/application/dto/ComissoesPdvDTO'

const UPSTREAM_PATH = '/api/v1/relatorios/usuarios-pdv/comissoes'

function appendIfValue(params: URLSearchParams, key: string, value: string | null | undefined) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v !== '') params.set(key, v)
}

/**
 * GET /api/relatorios/usuarios-pdv/comissoes
 * Relatório de comissões por usuário PDV (repassa ao fiscal).
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const taxaId = searchParams.get('taxaId')?.trim()
    if (!taxaId) {
      return NextResponse.json({ error: 'taxaId é obrigatório' }, { status: 400 })
    }

    const upstream = new URLSearchParams()
    upstream.set('taxaId', taxaId)

    const offset = searchParams.get('offset')
    const limit = searchParams.get('limit')
    if (offset !== null && offset !== '') upstream.set('offset', offset)
    if (limit !== null && limit !== '') upstream.set('limit', limit)

    appendIfValue(upstream, 'q', searchParams.get('q'))
    appendIfValue(upstream, 'dataCriacaoInicio', searchParams.get('dataCriacaoInicio'))
    appendIfValue(upstream, 'dataCriacaoFim', searchParams.get('dataCriacaoFim'))
    appendIfValue(upstream, 'dataFinalizacaoInicio', searchParams.get('dataFinalizacaoInicio'))
    appendIfValue(upstream, 'dataFinalizacaoFim', searchParams.get('dataFinalizacaoFim'))

    const orderFieldRaw = searchParams.get('orderByField')
    if (orderFieldRaw) {
      const parsed = OrderByFieldComissoesSchema.safeParse(orderFieldRaw)
      if (!parsed.success) {
        return NextResponse.json({ error: 'orderByField inválido' }, { status: 400 })
      }
      upstream.set('orderByField', parsed.data)
    }

    const orderDirRaw = searchParams.get('orderByDirection')
    if (orderDirRaw) {
      const parsed = OrderByDirectionComissoesSchema.safeParse(orderDirRaw)
      if (!parsed.success) {
        return NextResponse.json({ error: 'orderByDirection inválido' }, { status: 400 })
      }
      upstream.set('orderByDirection', parsed.data)
    }

    const apiClient = new ApiClient()
    const path = `${UPSTREAM_PATH}?${upstream.toString()}`
    const response = await apiClient.request<Record<string, unknown>>(path, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenInfo.token}` },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar relatório de comissões PDV:', error)
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
      { error: error instanceof Error ? error.message : 'Erro ao buscar comissões' },
      { status: 500 }
    )
  }
}
