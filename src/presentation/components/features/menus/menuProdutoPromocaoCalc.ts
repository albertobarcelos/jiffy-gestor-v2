/** Preço promocional mínimo aceito no form do menu (maior que R$ 1,00). */
export const VALOR_PROMOCIONAL_MINIMO = 1

/** Arredonda para 2 casas (centavos). */
export function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100) / 100
}

/** True quando o produto já tem promoção preenchida (critério de UI). */
export function produtoTemPromocaoPreenchida(valorPromocional: number | null | undefined): boolean {
  const n = Number(valorPromocional ?? 0)
  return Number.isFinite(n) && n > VALOR_PROMOCIONAL_MINIMO
}

/** True quando o valor promocional é válido para salvar com modo promoção ativo. */
export function isValorPromocionalValido(valorPromocional: number): boolean {
  return Number.isFinite(valorPromocional) && valorPromocional > VALOR_PROMOCIONAL_MINIMO
}

/**
 * % de desconto a partir do preço normal e do promocional.
 * Retorna null se não for possível calcular (normal ≤ 0).
 * Promocional 0 = sem preço promo → desconto 0 (não 100%).
 */
export function descontoPercentualFromPrecos(
  valorNormal: number,
  valorPromocional: number
): number | null {
  if (!Number.isFinite(valorNormal) || valorNormal <= 0) return null
  if (!Number.isFinite(valorPromocional) || valorPromocional < 0) return null
  if (valorPromocional === 0) return 0
  const pct = (1 - valorPromocional / valorNormal) * 100
  return arredondarCentavos(Math.min(100, Math.max(0, pct)))
}

/**
 * Preço promocional a partir do normal e do % de desconto.
 * Retorna null se não for possível calcular (normal ≤ 0).
 */
export function valorPromocionalFromDesconto(
  valorNormal: number,
  descontoPercentual: number
): number | null {
  if (!Number.isFinite(valorNormal) || valorNormal <= 0) return null
  if (!Number.isFinite(descontoPercentual)) return null
  const pct = Math.min(100, Math.max(0, descontoPercentual))
  return arredondarCentavos(Math.max(0, valorNormal * (1 - pct / 100)))
}
