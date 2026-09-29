/** Normaliza tipo de impacto de preço de complemento (catálogo público). */
export function normalizeTipoImpactoPreco(raw: unknown): 'aumenta' | 'diminui' | 'nenhum' {
  if (!raw) return 'nenhum'
  const tipo = String(raw)
    .trim()
    .toLowerCase()
  if (
    tipo === 'aumenta' ||
    tipo === 'increase' ||
    tipo === 'soma' ||
    tipo === 'acrescimo' ||
    tipo === 'acréscimo' ||
    tipo === 'plus'
  ) {
    return 'aumenta'
  }
  if (
    tipo === 'diminui' ||
    tipo === 'decrease' ||
    tipo === 'subtrai' ||
    tipo === 'desconto' ||
    tipo === 'minus'
  ) {
    return 'diminui'
  }
  return 'nenhum'
}
