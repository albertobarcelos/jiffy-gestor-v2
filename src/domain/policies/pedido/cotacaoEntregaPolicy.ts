type ResultadoCotacaoTaxaMorada =
  | { status: 'ok'; valorTaxa: number }
  | { status: 'fora' }
  | { status: 'erro'; message: string }

export type ResultadoCotacaoTaxaUi =
  | { status: 'idle' }
  | { status: 'loading' }
  | ResultadoCotacaoTaxaMorada

/**
 * Decide o status da cotação na UI.
 * Se já existe resultado para a chave atual (endereço + itens), reutiliza o cache
 * mesmo durante refetch — voltar de Pagamento para Informações não deve recalcular.
 */
export function resolverResultadoCotacaoTaxaUi(params: {
  podeCotar: boolean
  chaveItensAtual: string
  chaveItensDebounced: string
  data?: ResultadoCotacaoTaxaMorada
  errorMessage?: string
  /** Recálculo explícito (timeout/erro) não deve manter o cache de falha na UI. */
  isFetching?: boolean
}): ResultadoCotacaoTaxaUi {
  if (!params.podeCotar) return { status: 'idle' }
  if (params.chaveItensDebounced !== params.chaveItensAtual) {
    return { status: 'loading' }
  }
  if (params.isFetching && (!params.data || params.data.status === 'erro')) {
    return { status: 'loading' }
  }
  if (params.data) return params.data
  if (params.errorMessage) return { status: 'erro', message: params.errorMessage }
  return { status: 'loading' }
}

export type TaxaEntregaOverrideModoPolicy = 'automatica' | 'sem_taxa' | 'catalogo'

export type StatusCoberturaEntregaPedido = 'ok' | 'fora' | 'pendente' | 'indisponivel' | null

/**
 * Impede avançar para Pagamento enquanto a taxa automática não terminou
 * (ou falhou). Override de catálogo / sem taxa libera o passo.
 */
export function mensagemBloqueioTaxaAutomatica(params: {
  pedidoComEntrega: boolean
  taxaEntregaOverride?: TaxaEntregaOverrideModoPolicy
  enderecoEntregaCoberturaStatus?: StatusCoberturaEntregaPedido
  enderecoEntregaTemGeo?: boolean
}): string | null {
  if (!params.pedidoComEntrega) return null
  const modo = params.taxaEntregaOverride ?? 'automatica'
  if (modo !== 'automatica') return null

  const status = params.enderecoEntregaCoberturaStatus
  if (status === 'ok' || status === 'fora') return null
  if (status === 'indisponivel') {
    return 'Não foi possível calcular a taxa automática. Escolha outra taxa para continuar.'
  }
  if (status === 'pendente' || (status == null && params.enderecoEntregaTemGeo)) {
    return 'Aguarde o cálculo da taxa de entrega ou escolha outra taxa.'
  }
  return null
}

export function mensagemIndicaForaDaCobertura(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('cobertura') ||
    lower.includes('fora da área') ||
    lower.includes('fora da area') ||
    lower.includes('fora do raio') ||
    lower.includes('raio de entrega') ||
    lower.includes('área de entrega') ||
    lower.includes('area de entrega') ||
    lower.includes('coberto por nenhuma') ||
    lower.includes('não atend') ||
    lower.includes('nao atend')
  )
}
