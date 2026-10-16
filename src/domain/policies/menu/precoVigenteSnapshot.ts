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

/** Arredonda dinheiro para 2 casas (centavos). */
export function arredondarCentavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/** Arredonda % para no máximo 1 casa decimal (passo 0,1%). */
export function arredondarPercentualUmaCasa(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 10) / 10
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
 * Aplica % de desconto ao preço normal → promocional em centavos.
 * O % é normalizado para 1 casa decimal (0–100).
 */
export function valorPromocionalFromDesconto(
  valorNormal: number,
  descontoPercentual: number
): number | null {
  if (!Number.isFinite(valorNormal) || valorNormal <= 0) return null
  if (!Number.isFinite(descontoPercentual)) return null
  const pct = arredondarPercentualUmaCasa(Math.min(100, Math.max(0, descontoPercentual)))
  const desconto = valorNormal * (pct / 100)
  return arredondarCentavos(Math.max(0, valorNormal - desconto))
}

/**
 * Descobre o % (passo 0,1) que regenera exatamente o promocional via
 * `valorPromocionalFromDesconto`. Retorna null se não houver match.
 */
export function findDescontoPercentualExato(
  valorNormal: number,
  valorPromocional: number
): number | null {
  if (!Number.isFinite(valorNormal) || valorNormal <= 0) return null
  if (!Number.isFinite(valorPromocional) || valorPromocional < 0) return null
  if (valorPromocional > valorNormal) return null

  const promoAlvo = arredondarCentavos(valorPromocional)
  if (promoAlvo === 0) return 0

  const approximate = ((valorNormal - promoAlvo) / valorNormal) * 100
  const base = arredondarPercentualUmaCasa(approximate)
  const candidatos = [base, base - 0.1, base + 0.1]
    .map(arredondarPercentualUmaCasa)
    .filter(p => p >= 0 && p <= 100)

  const vistos = new Set<number>()
  for (const pct of candidatos) {
    if (vistos.has(pct)) continue
    vistos.add(pct)
    const gerado = valorPromocionalFromDesconto(valorNormal, pct)
    if (gerado != null && gerado === promoAlvo) return pct
  }
  return null
}

/**
 * % de desconto a partir do preço normal e do promocional.
 * Prefere o % de 1 casa que regenera o promo exatamente; senão fallback arredondado a 0,1.
 * Promocional 0 = sem preço promo → desconto 0 (não 100%).
 */
export function descontoPercentualFromPrecos(
  valorNormal: number,
  valorPromocional: number
): number | null {
  if (!Number.isFinite(valorNormal) || valorNormal <= 0) return null
  if (!Number.isFinite(valorPromocional) || valorPromocional < 0) return null
  if (valorPromocional === 0) return 0

  const exato = findDescontoPercentualExato(valorNormal, valorPromocional)
  if (exato != null) return exato

  const approximate = ((valorNormal - valorPromocional) / valorNormal) * 100
  return arredondarPercentualUmaCasa(Math.min(100, Math.max(0, approximate)))
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
 * Cobrança usa só os preços; o % é derivado para UI (badge/form).
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
