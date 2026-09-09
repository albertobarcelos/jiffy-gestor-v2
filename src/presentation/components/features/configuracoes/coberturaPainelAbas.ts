export const COBERTURA_PAINEL_ABAS = [
  { id: 'raios', label: 'Taxas por Raio' },
  { id: 'areas', label: 'Taxas por Área' },
  { id: 'resumo', label: 'Resumo' },
] as const

export type CoberturaPainelAba = (typeof COBERTURA_PAINEL_ABAS)[number]['id']

export function camadasMapaCobertura(aba: CoberturaPainelAba): {
  raios: boolean
  areas: boolean
} {
  if (aba === 'raios') return { raios: true, areas: false }
  if (aba === 'areas') return { raios: false, areas: true }
  return { raios: true, areas: true }
}

export function parseTaxaDraftCobertura(bruto: string): number | null {
  const valor = Number(bruto.replace(',', '.').trim())
  if (!Number.isFinite(valor) || valor < 0) return null
  return valor
}

export function parsePrazoDraftCobertura(bruto: string): number | null {
  const minutos = Number(String(bruto).replace(',', '.').trim())
  if (!Number.isFinite(minutos) || minutos < 0 || !Number.isInteger(minutos)) return null
  return minutos
}

export function linhaTaxaPrazoPendente(
  brutoTaxa: string,
  brutoPrazo: string,
  valorAtual: number,
  prazoAtual: number
): boolean {
  const taxa = parseTaxaDraftCobertura(brutoTaxa)
  const prazo = parsePrazoDraftCobertura(brutoPrazo)
  const taxaDiferente = brutoTaxa.trim() === '' || taxa === null || taxa !== valorAtual
  const prazoDiferente = brutoPrazo.trim() === '' || prazo === null || prazo !== prazoAtual
  return taxaDiferente || prazoDiferente
}

export function ativoCoberturaPendente(draft: boolean | undefined, atual: boolean): boolean {
  return draft !== undefined && draft !== atual
}

export type ResultadoLoteCobertura = {
  ok: number
  total: number
}

export function mensagemFalhaLoteCobertura(resultado: ResultadoLoteCobertura): string {
  return `Salvamos ${resultado.ok} de ${resultado.total}. Tente de novo nas que falharam.`
}
