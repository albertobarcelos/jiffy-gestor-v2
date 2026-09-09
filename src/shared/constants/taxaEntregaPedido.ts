/** Valor do select quando a taxa segue a cobertura (backend calcula no create). */
export const TAXA_ENTREGA_SELECT_AUTOMATICA = '__automatica__'

/** Valor do select / estado quando o atendente remove a taxa. */
export const TAXA_ENTREGA_SEM_TAXA_ID = '__sem_taxa__'

export type TaxaEntregaOverrideModo = 'automatica' | 'sem_taxa' | 'catalogo'

export function resolverModoTaxaEntregaOverride(
  taxaEntregaId: string | null | undefined
): TaxaEntregaOverrideModo {
  const id = taxaEntregaId?.trim() ?? ''
  if (!id || id === TAXA_ENTREGA_SELECT_AUTOMATICA) return 'automatica'
  if (id === TAXA_ENTREGA_SEM_TAXA_ID) return 'sem_taxa'
  return 'catalogo'
}

export function taxaEntregaIdParaSelect(taxaEntregaId: string): string {
  return taxaEntregaId.trim() || TAXA_ENTREGA_SELECT_AUTOMATICA
}

export function selectValueParaTaxaEntregaId(value: string): string {
  if (value === TAXA_ENTREGA_SELECT_AUTOMATICA) return ''
  return value
}

/** `taxaId` do catálogo para o PATCH; `null` = sem taxa / automática. */
export function taxaEntregaIdParaPatch(taxaEntregaId: string | null | undefined): string | null {
  const modo = resolverModoTaxaEntregaOverride(taxaEntregaId)
  if (modo !== 'catalogo') return null
  return taxaEntregaId!.trim()
}
