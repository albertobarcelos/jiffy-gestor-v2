/**
 * Formatação de display BRL do cardápio (canônico).
 * Preferir este helper em UI; máscaras de input ficam em `formatBRLFromMaskedInput`.
 */
export function formatDeliveryCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
