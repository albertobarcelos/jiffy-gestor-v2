/** Normaliza tipo de impacto de preço de complemento (catálogo público). */
export function normalizeTipoImpactoPreco(raw: unknown): 'aumenta' | 'diminui' | 'nenhum' {
  if (!raw) return 'nenhum'
  const tipo = String(raw).toLowerCase()
  if (tipo === 'aumenta' || tipo === 'increase') return 'aumenta'
  if (tipo === 'diminui' || tipo === 'decrease') return 'diminui'
  return 'nenhum'
}
