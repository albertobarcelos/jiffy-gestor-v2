/** Mensagem amigável quando não há dados / upstream responde 404 genérico. */
export const MSG_SEM_DADOS_PECA_TAMBEM =
  'Ainda não há vendas atribuídas ao Peça Também neste período. Assim que um item do carrossel for vendido, o resultado aparece aqui.'

export type RelatorioPecaTambemResumoDTO = {
  impressoes: number
  cliques: number
  adds: number
  produtosVendidos: number
  faturamento: number
  /** Faturamento de itens de delivery (não cancelados) no período. */
  faturamentoTotalPeriodo: number
  /** Quantidade de itens de delivery (não cancelados) no período. */
  produtosVendidosTotalPeriodo: number
  pedidosComPecaTambem: number
  conversoes: number
}

export type RelatorioPecaTambemRankingItemDTO = {
  produtoId: string
  nomeProduto: string
  quantidade: number
  faturamento: number
}

export type RelatorioPecaTambemResponseDTO = {
  resumo: RelatorioPecaTambemResumoDTO
  ranking: RelatorioPecaTambemRankingItemDTO[]
}

export function mapRelatorioPecaTambemResponse(
  raw: Record<string, unknown>
): RelatorioPecaTambemResponseDTO {
  const resumoRaw = (raw.resumo ?? {}) as Record<string, unknown>
  const rankingRaw = Array.isArray(raw.ranking) ? raw.ranking : []

  return {
    resumo: {
      impressoes: Number(resumoRaw.impressoes) || 0,
      cliques: Number(resumoRaw.cliques) || 0,
      adds: Number(resumoRaw.adds) || 0,
      produtosVendidos: Number(resumoRaw.produtosVendidos) || 0,
      faturamento: Number(resumoRaw.faturamento) || 0,
      faturamentoTotalPeriodo: Number(resumoRaw.faturamentoTotalPeriodo) || 0,
      produtosVendidosTotalPeriodo: Number(resumoRaw.produtosVendidosTotalPeriodo) || 0,
      pedidosComPecaTambem: Number(resumoRaw.pedidosComPecaTambem) || 0,
      conversoes: Number(resumoRaw.conversoes) || 0,
    },
    ranking: rankingRaw.map(item => {
      const row = item as Record<string, unknown>
      return {
        produtoId: String(row.produtoId ?? ''),
        nomeProduto: String(row.nomeProduto ?? 'Produto'),
        quantidade: Number(row.quantidade) || 0,
        faturamento: Number(row.faturamento) || 0,
      }
    }),
  }
}
