/** % de desconto a partir do preço regular e do vigente (promo). */
export function descontoPercentualDelivery(
  precoRegular: number,
  precoVigente: number
): number | null {
  if (!Number.isFinite(precoRegular) || precoRegular <= 0) return null
  if (!Number.isFinite(precoVigente) || precoVigente < 0) return null
  if (precoVigente <= 0 || precoVigente >= precoRegular) return null
  const pct = (1 - precoVigente / precoRegular) * 100
  return Math.round(pct * 100) / 100
}

export type PrecosDeliveryProduto = {
  preco: number
  precoRegular: number | null
  descontoPercentual: number | null
}

/** Resolve preço vigente / regular / % a partir do snapshot do catálogo público. */
export function resolverPrecosDeliveryProduto(input: {
  valor: number
  valorPromocional?: number | null
  valorVigente?: number | null
  promocaoAtiva?: boolean | null
}): PrecosDeliveryProduto {
  const valor = Number(input.valor)
  const valorPromocional = Number(input.valorPromocional ?? 0)
  const promocaoAtiva = input.promocaoAtiva === true
  const vigenteInformado =
    typeof input.valorVigente === 'number' && Number.isFinite(input.valorVigente)
      ? input.valorVigente
      : null

  const mostrarPromo =
    promocaoAtiva &&
    Number.isFinite(valorPromocional) &&
    valorPromocional > 0 &&
    Number.isFinite(valor) &&
    valorPromocional < valor

  const preco = mostrarPromo
    ? (vigenteInformado ?? valorPromocional)
    : (vigenteInformado ?? valor)

  return {
    preco: Number.isFinite(preco) ? preco : 0,
    precoRegular: mostrarPromo ? valor : null,
    descontoPercentual: mostrarPromo
      ? descontoPercentualDelivery(valor, valorPromocional)
      : null,
  }
}
