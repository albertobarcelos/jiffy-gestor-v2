import {
  descontoPercentualFromPrecos,
  produtoTemPromocaoPreenchida,
  promocaoSnapshotVigente,
  valorPromocionalFromDesconto,
  type SnapshotPrecoMenu,
} from '@/src/domain/policies/menu/precoVigenteSnapshot'

export type AtualizacaoPrecoNormal =
  | { tipo: 'bloqueada' }
  | { tipo: 'somenteValor'; valor: number }
  | { tipo: 'valorEPromocional'; valor: number; valorPromocional: number }

/**
 * Trava o preço normal só com promoção vigente.
 * Pausada não trava: o normal é o preço cobrado; o % da campanha se preserva.
 */
export function deveTravarPrecoNormal(input: SnapshotPrecoMenu): boolean {
  return promocaoSnapshotVigente(input)
}

/**
 * Recalcula o promocional mantendo o % quando o preço normal muda
 * (reajuste com promoção pausada).
 */
export function recalcularPromocionalPreservandoPercentual(
  valorNormalNovo: number,
  valorNormalAnterior: number,
  valorPromocionalAnterior: number
): number | null {
  const pct = descontoPercentualFromPrecos(valorNormalAnterior, valorPromocionalAnterior)
  if (pct == null) return null
  return valorPromocionalFromDesconto(valorNormalNovo, pct)
}

/**
 * Decide o patch do preço normal: recusar se vigente, preservar % se pausada.
 */
export function resolverAtualizacaoPrecoNormal(
  valorNovo: number,
  snapshot: SnapshotPrecoMenu
): AtualizacaoPrecoNormal {
  if (deveTravarPrecoNormal(snapshot)) return { tipo: 'bloqueada' }

  if (produtoTemPromocaoPreenchida(snapshot.valorPromocional)) {
    const valorPromocional = recalcularPromocionalPreservandoPercentual(
      valorNovo,
      snapshot.valor,
      Number(snapshot.valorPromocional ?? 0)
    )
    if (valorPromocional != null) {
      return { tipo: 'valorEPromocional', valor: valorNovo, valorPromocional }
    }
  }

  return { tipo: 'somenteValor', valor: valorNovo }
}
