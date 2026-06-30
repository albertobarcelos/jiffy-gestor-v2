import type { Produto } from '@/src/domain/entities/Produto'

export type AjustePrecoModo = 'valor' | 'percentual'
export type AjustePrecoDirecao = 'increase' | 'decrease'

/** Valida o ajuste informado; retorna mensagem de erro ou null se válido. */
export function validarAjustePrecoLote(params: {
  parsedAdjust: number
  adjustMode: AjustePrecoModo
  adjustDirection: AjustePrecoDirecao
  produtosSelecionados: Produto[]
}): string | null {
  const { parsedAdjust, adjustMode, adjustDirection, produtosSelecionados } = params

  if (isNaN(parsedAdjust) || parsedAdjust === 0) {
    return 'Informe um valor de ajuste válido'
  }
  if (parsedAdjust < 0) {
    return 'Informe apenas valores positivos'
  }
  if (produtosSelecionados.length === 0) {
    return 'Não foi possível identificar os produtos selecionados.'
  }

  if (adjustDirection === 'decrease') {
    if (adjustMode === 'valor') {
      const menorValor = Math.min(...produtosSelecionados.map((p) => p.getValor()))
      if (parsedAdjust >= menorValor) {
        return 'O valor para diminuir não pode ser maior ou igual ao menor preço selecionado'
      }
    } else if (adjustMode === 'percentual' && parsedAdjust >= 100) {
      return 'A porcentagem para diminuir deve ser menor que 100%'
    }
  }

  return null
}

/** Calcula o novo valor unitário após o ajuste (arredondado em 2 casas). */
export function calcularNovoValorProdutoLote(
  valorAtual: number,
  adjustMode: AjustePrecoModo,
  adjustDirection: AjustePrecoDirecao,
  adjustValue: number
): number {
  const directionSign = adjustDirection === 'increase' ? 1 : -1
  let novoValor =
    adjustMode === 'valor'
      ? valorAtual + directionSign * adjustValue
      : valorAtual * (1 + (directionSign * adjustValue) / 100)
  return Number(novoValor.toFixed(2))
}
