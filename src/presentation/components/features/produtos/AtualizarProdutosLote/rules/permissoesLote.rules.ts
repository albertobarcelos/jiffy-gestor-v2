import type { PermissaoCampoChave } from '../types'

/** Monta o body parcial de permissões PDV apenas com os campos marcados. */
export function montarBodyPermissoesParcial(
  campos: Set<PermissaoCampoChave>,
  valor: boolean
): Record<string, boolean> {
  const body: Record<string, boolean> = {}
  if (campos.has('favorito')) body.favorito = valor
  if (campos.has('permiteDesconto')) body.permiteDesconto = valor
  if (campos.has('permiteAcrescimo')) body.permiteAcrescimo = valor
  if (campos.has('permiteAlterarPreco')) body.permiteAlterarPreco = valor
  if (campos.has('incideTaxa')) body.incideTaxa = valor
  if (campos.has('abreComplementos')) body.abreComplementos = valor
  return body
}
