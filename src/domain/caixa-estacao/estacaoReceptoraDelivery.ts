export interface EstacaoComPapelDelivery {
  id: string
  nome?: string
  gestorDelivery: boolean
}

/** A única estação `gestorDelivery` da empresa — destino do caixa do delivery. */
export function resolverEstacaoReceptoraDelivery<T extends EstacaoComPapelDelivery>(
  estacoes: T[]
): T | null {
  return estacoes.find(estacao => estacao.gestorDelivery) ?? null
}

export function estacaoEhReceptoraDelivery(
  estacaoId: string | null | undefined,
  estacoes: EstacaoComPapelDelivery[]
): boolean {
  const id = estacaoId?.trim()
  if (!id) return false
  return estacoes.some(estacao => estacao.id === id && estacao.gestorDelivery)
}
