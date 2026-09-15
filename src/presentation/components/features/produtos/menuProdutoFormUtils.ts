export function formatMenuProdutoCurrency(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (!numbers) return ''
  const num = parseFloat(numbers) / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

export function parseMenuProdutoCurrency(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return NaN
  return parseFloat(digits) / 100
}
