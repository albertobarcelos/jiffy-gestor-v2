import {
  OrderByDirectionRelatorioEntregasSchema,
  OrderByFieldRelatorioEntregasSchema,
} from '@/src/application/dto/RelatorioEntregasDTO'

export const RELATORIO_ENTREGAS_LIMIT_MAX = 100
export const RELATORIO_ENTREGAS_DETALHE_LIMIT_MAX = 50
export const RELATORIO_ENTREGAS_INTERVALO_MAX_DIAS = 90

function appendIfValue(params: URLSearchParams, key: string, value: string | null | undefined) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v !== '') params.set(key, v)
}

export function montarQueryRelatorioEntregas(searchParams: URLSearchParams): {
  ok: true
  query: URLSearchParams
} | { ok: false; error: string } {
  const upstream = new URLSearchParams()

  const offset = searchParams.get('offset')
  const limit = searchParams.get('limit')
  if (offset !== null && offset !== '') upstream.set('offset', offset)
  if (limit !== null && limit !== '') upstream.set('limit', limit)

  appendIfValue(upstream, 'q', searchParams.get('q'))
  appendIfValue(upstream, 'dataCriacaoInicio', searchParams.get('dataCriacaoInicio'))
  appendIfValue(upstream, 'dataCriacaoFim', searchParams.get('dataCriacaoFim'))
  appendIfValue(upstream, 'dataFinalizacaoInicio', searchParams.get('dataFinalizacaoInicio'))
  appendIfValue(upstream, 'dataFinalizacaoFim', searchParams.get('dataFinalizacaoFim'))
  appendIfValue(upstream, 'operacaoCaixaId', searchParams.get('operacaoCaixaId'))

  const orderFieldRaw = searchParams.get('orderByField')
  if (orderFieldRaw) {
    const parsed = OrderByFieldRelatorioEntregasSchema.safeParse(orderFieldRaw)
    if (!parsed.success) return { ok: false, error: 'orderByField inválido' }
    upstream.set('orderByField', parsed.data)
  }

  const orderDirRaw = searchParams.get('orderByDirection')
  if (orderDirRaw) {
    const parsed = OrderByDirectionRelatorioEntregasSchema.safeParse(orderDirRaw)
    if (!parsed.success) return { ok: false, error: 'orderByDirection inválido' }
    upstream.set('orderByDirection', parsed.data)
  }

  return { ok: true, query: upstream }
}
