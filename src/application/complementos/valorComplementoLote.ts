import { arredondarCentavos } from '@/src/domain/policies/menu/precoVigenteSnapshot'

/** Limite do PATCH de overrides (Zod + API). */
export const LIMITE_VINCULOS_OVERRIDE = 100

export const MODOS_VALOR_COMPLEMENTO_LOTE = [
  { id: 'acrescentar', label: 'Acrescentar' },
  { id: 'alterar', label: 'Alterar' },
  { id: 'diminuir', label: 'Diminuir' },
] as const

export type ModoValorComplementoLote = (typeof MODOS_VALOR_COMPLEMENTO_LOTE)[number]['id']

/**
 * Calcula o valor a gravar em cada linha marcada, conforme o modo ativo na tela de lote.
 * Em diminuir, o resultado não fica abaixo de zero (a API rejeita negativo).
 */
export function valorComplementoNoModo(
  atual: number,
  digitado: number,
  modo: ModoValorComplementoLote
): number {
  if (modo === 'acrescentar') return arredondarCentavos(atual + digitado)
  if (modo === 'diminuir') return Math.max(0, arredondarCentavos(atual - digitado))
  return digitado
}

/**
 * No lote de ativo, só envia quem ainda não está no estado desejado.
 * Quem já está pausado/ativo permanece como está.
 */
export function filtrarLinhasParaAtivoAlvo<T extends { ativoAtual: boolean }>(
  linhas: readonly T[],
  ativoAlvo: boolean
): T[] {
  return linhas.filter(item => item.ativoAtual !== ativoAlvo)
}

export function partirEmLotes<T>(itens: readonly T[], tamanho: number): T[][] {
  if (tamanho <= 0) return [itens.slice()]
  const lotes: T[][] = []
  for (let indice = 0; indice < itens.length; indice += tamanho) {
    lotes.push(itens.slice(indice, indice + tamanho))
  }
  return lotes
}
