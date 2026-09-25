export type ProdutoPreviewModel = {
  nome: string
  /** Preço vigente exibido em destaque. */
  preco: number | null
  /**
   * Preço regular riscado quando a promoção está ativa e o vigente é o promocional.
   */
  precoRegular?: number | null
  promocaoAtiva?: boolean
  /** % de desconto exibido ao lado do preço riscado (ex.: 30). */
  descontoPercentual?: number | null
  descricao?: string | null
  imagemUrl?: string | null
}

export function formatDescontoPreview(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  const rounded = Math.round(value * 100) / 100
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
  return `${label}% OFF`
}

export function parsePrecoPreviewFromInput(value: string): number | null {
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  return parseFloat(digits) / 100
}

export function formatPrecoPreview(value: number | null | undefined): string {
  const amount = Number.isFinite(value) && (value as number) >= 0 ? (value as number) : 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}
