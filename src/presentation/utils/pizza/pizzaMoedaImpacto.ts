import type { TipoImpactoPreco } from '@/src/shared/types/pizza'
import { formatBRLFromMaskedInput, parseBRLToNumber } from '@/src/shared/utils/formatters'

/** Prefixo visual do valor conforme o impacto (`+` / `-` / nenhum). */
export function prefixoImpactoValor(tipoImpactoPreco: TipoImpactoPreco): '+' | '-' | null {
  if (tipoImpactoPreco === 'aumenta') return '+'
  if (tipoImpactoPreco === 'diminui') return '-'
  return null
}

/** Ex.: `+ R$ 4,00`, `- R$ 8,50` ou `R$ 0,00` (nenhum / sem tipo). */
export function formatarMoedaBrlComImpacto(
  valor: number,
  tipoImpactoPreco?: TipoImpactoPreco | null
): string {
  const moeda = formatBRLFromMaskedInput(valor)
  if (!tipoImpactoPreco) return moeda
  const prefixo = prefixoImpactoValor(tipoImpactoPreco)
  return prefixo ? `${prefixo} ${moeda}` : moeda
}

/**
 * Máscara de digitação em centavos + reaplica o prefixo de impacto.
 * Aceita texto com `+`/`-`/`R$` (são ignorados na leitura dos dígitos).
 */
export function formatarDigitacaoMoedaBrlComImpacto(
  rawInput: string,
  tipoImpactoPreco?: TipoImpactoPreco | null
): string {
  const moeda = formatBRLFromMaskedInput(rawInput)
  if (!tipoImpactoPreco) return moeda
  const prefixo = prefixoImpactoValor(tipoImpactoPreco)
  return prefixo ? `${prefixo} ${moeda}` : moeda
}

/** Lê o valor absoluto de um input que pode trazer prefixo de impacto. */
export function parseMoedaBrlComImpacto(rawInput: string): number {
  const cleaned = rawInput.replace(/^\s*[+-]\s*/, '')
  return parseBRLToNumber(cleaned) ?? 0
}
