import type { PrecoComplementoPizza, TipoImpactoPreco } from '@/src/shared/types/pizza'
import { formatBRLFromMaskedInput, parseBRLToNumber } from '@/src/shared/utils/formatters'

export function nomeImpactoPizzaComplemento(tipoImpactoPreco: TipoImpactoPreco) {
  if (tipoImpactoPreco === 'aumenta') return 'Acréscimo'
  if (tipoImpactoPreco === 'diminui') return 'Desconto'
  return 'Sem impacto de preço'
}

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

export function buildPizzaComplementoPrecosSelecionados(input: {
  tamanhos: Array<{ id: string; nome: string }>
  valores: Record<string, { ativo: boolean; valor: number }>
  tipoImpactoPreco: TipoImpactoPreco
}): { ok: true; precos: PrecoComplementoPizza[] } | { ok: false; message: string } {
  const selecionados = input.tamanhos.filter(tamanho => input.valores[tamanho.id]?.ativo)
  if (selecionados.length === 0) {
    return {
      ok: false,
      message: 'Selecione ao menos um tamanho para disponibilizar este adicional',
    }
  }

  const novosPrecos: PrecoComplementoPizza[] = []
  for (const tamanho of selecionados) {
    if (input.tipoImpactoPreco === 'nenhum') {
      novosPrecos.push({ pizzaTamanhoId: tamanho.id, valor: 0 })
      continue
    }

    const valor = input.valores[tamanho.id]?.valor
    if (!Number.isFinite(valor) || valor < 0) {
      return {
        ok: false,
        message: `Informe um preço válido para o tamanho ${tamanho.nome}`,
      }
    }
    novosPrecos.push({ pizzaTamanhoId: tamanho.id, valor })
  }

  return { ok: true, precos: novosPrecos }
}
