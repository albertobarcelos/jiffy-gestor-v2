export type ProdutoPreviewModel = {
  nome: string
  preco: number | null
  descricao?: string | null
  imagemUrl?: string | null
}

export function parsePrecoPreviewFromInput(value: string): number | null {
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  return parseFloat(digits) / 100
}

export function formatPrecoPreview(value: number | null | undefined): string {
  const amount = Number.isFinite(value) && (value as number) > 0 ? (value as number) : 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}
