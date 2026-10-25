import type { BuscarMeiosPagamentosParams } from '@/src/domain/repositories/IMeioPagamentoRepository'

function flagQuery(searchParams: URLSearchParams, chave: string): boolean | null {
  const raw = searchParams.get(chave)
  return raw !== null ? raw === 'true' : null
}

/** Lê o GET do BFF `/api/meios-pagamentos`. */
export function parseFiltroListagemMeiosPagamento(
  searchParams: URLSearchParams
): BuscarMeiosPagamentosParams {
  return {
    limit: parseInt(searchParams.get('limit') || '10', 10),
    offset: parseInt(searchParams.get('offset') || '0', 10),
    q: searchParams.get('q') || '',
    ativo: flagQuery(searchParams, 'ativo'),
    ativoEntregaDelivery: flagQuery(searchParams, 'ativoEntregaDelivery'),
    ativoRetiradaDelivery: flagQuery(searchParams, 'ativoRetiradaDelivery'),
    ativoDelivery: flagQuery(searchParams, 'ativoDelivery'),
  }
}

type QueryListagemMeios = {
  q?: string
  ativo?: boolean | null
  ativoEntregaDelivery?: boolean | null
  ativoRetiradaDelivery?: boolean | null
  ativoDelivery?: boolean | null
  limit: number
  offset: number
}

/**
 * Query da listagem.
 * Flag nova tem prioridade. `ativoDelivery` legado segue na URL
 * para a API que ainda não lê os canais separados; sozinho, preenche só entrega.
 */
export function montarQueryListagemMeiosPagamento(params: QueryListagemMeios): URLSearchParams {
  const search = new URLSearchParams()
  search.set('limit', String(params.limit))
  search.set('offset', String(params.offset))
  if (params.q) search.set('q', params.q)
  if (params.ativo != null) search.set('ativo', String(params.ativo))
  if (params.ativoEntregaDelivery != null) {
    search.set('ativoEntregaDelivery', String(params.ativoEntregaDelivery))
  } else if (params.ativoDelivery != null && params.ativoRetiradaDelivery == null) {
    search.set('ativoEntregaDelivery', String(params.ativoDelivery))
  }
  if (params.ativoRetiradaDelivery != null) {
    search.set('ativoRetiradaDelivery', String(params.ativoRetiradaDelivery))
  }
  if (params.ativoDelivery != null) {
    search.set('ativoDelivery', String(params.ativoDelivery))
  }
  return search
}
