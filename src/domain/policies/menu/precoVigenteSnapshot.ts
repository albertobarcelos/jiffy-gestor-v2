/** Preço promocional mínimo aceito ao gravar o snapshot (maior que R$ 1,00). */
export const VALOR_PROMOCIONAL_MINIMO = 1

export type SnapshotPrecoMenu = {
  valor: number
  valorPromocional?: number | null
  promocaoAtiva?: boolean | null
}

export type PrecosSnapshotMenu = {
  /** Preço cobrado / exibido em destaque. */
  preco: number
  /** Preço normal riscado quando a promo está vigente. */
  precoRegular: number | null
  descontoPercentual: number | null
}

export function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100) / 100
}

/** True quando o snapshot já tem um valor promocional preenchido (critério de UI do form). */
export function produtoTemPromocaoPreenchida(valorPromocional: number | null | undefined): boolean {
  const n = Number(valorPromocional ?? 0)
  return Number.isFinite(n) && n > VALOR_PROMOCIONAL_MINIMO
}

/** True quando o valor promocional pode ser gravado com modo promoção ativo. */
export function isValorPromocionalValido(
  valorPromocional: number,
  valorNormal: number
): boolean {
  return (
    Number.isFinite(valorPromocional) &&
    Number.isFinite(valorNormal) &&
    valorNormal > 0 &&
    valorPromocional > VALOR_PROMOCIONAL_MINIMO &&
    valorPromocional < valorNormal
  )
}

/**
 * % de desconto a partir do preço normal e do promocional.
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

/** Preço promocional a partir do normal e do % de desconto. */
export function valorPromocionalFromDesconto(
  valorNormal: number,
  descontoPercentual: number
): number | null {
  if (!Number.isFinite(valorNormal) || valorNormal <= 0) return null
  if (!Number.isFinite(descontoPercentual)) return null
  const pct = Math.min(100, Math.max(0, descontoPercentual))
  return arredondarCentavos(Math.max(0, valorNormal * (1 - pct / 100)))
}

/**
 * Promo vigente neste cardápio: flag ligada e promocional menor que o normal.
 * Usada para exibir e para cobrar — não para validar o form (isso é `isValorPromocionalValido`).
 */
export function promocaoSnapshotVigente(input: SnapshotPrecoMenu): boolean {
  const valor = Number(input.valor)
  const valorPromocional = Number(input.valorPromocional ?? 0)
  return (
    input.promocaoAtiva === true &&
    Number.isFinite(valor) &&
    Number.isFinite(valorPromocional) &&
    valorPromocional > 0 &&
    valorPromocional < valor
  )
}

/**
 * Preço vigente do snapshot do menu.
 * Fonte: `valor` + `valorPromocional` + `promocaoAtiva`. Sem override silencioso.
 */
export function resolverPrecosSnapshotMenu(input: SnapshotPrecoMenu): PrecosSnapshotMenu {
  const valor = Number(input.valor)
  const valorPromocional = Number(input.valorPromocional ?? 0)

  if (!Number.isFinite(valor)) {
    return { preco: 0, precoRegular: null, descontoPercentual: null }
  }

  if (!promocaoSnapshotVigente(input)) {
    return { preco: valor, precoRegular: null, descontoPercentual: null }
  }

  return {
    preco: valorPromocional,
    precoRegular: valor,
    descontoPercentual: descontoPercentualFromPrecos(valor, valorPromocional),
  }
}
