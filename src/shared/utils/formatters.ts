/**
 * Formata valor para Real (R$)
 * Replica exatamente a função transformarParaReal do Flutter
 */
export function transformarParaReal(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return 'R$ 0,00'

  let numero: number

  if (typeof valor === 'string') {
    numero = parseFloat(valor.replace(',', '.')) || 0.0
  } else if (typeof valor === 'number') {
    numero = valor
  } else {
    return 'R$ 0,00'
  }

  return `R$ ${numero.toFixed(2).replace('.', ',')}`
}

/**
 * Converte valor brasileiro (R$ 1.234,56 ou 1.234,56) para formato americano (1234.56)
 * Replica a função brToEUA do Flutter
 */
export function brToEUA(valorBr: string): number {
  // Remove R$ e espaços
  let valor = valorBr.replace(/R\$/g, '').trim()

  if (valor === '') {
    return 0.0
  }

  // Remove pontos (separadores de milhar)
  valor = valor.replace(/\./g, '')

  // Substitui vírgula por ponto
  valor = valor.replace(',', '.')

  return parseFloat(valor) || 0.0
}

