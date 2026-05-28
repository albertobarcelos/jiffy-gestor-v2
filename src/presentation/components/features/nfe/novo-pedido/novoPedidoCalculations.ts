import type { ComplementoSelecionado, ProdutoSelecionado } from './types'

export function formatarNumeroComMilhar(valor: number): string {
  if (valor === 0) return '0,00'
  const partes = valor.toFixed(2).split('.')
  const parteInteira = partes[0]
  const parteDecimal = partes[1]
  const parteInteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${parteInteiraFormatada},${parteDecimal}`
}

export function formatarValorComplemento(
  valor: number,
  tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
): string {
  const valorFormatado = formatarNumeroComMilhar(valor)
  const tipo = tipoImpactoPreco || 'nenhum'

  switch (tipo) {
    case 'aumenta':
      return `+ ${valorFormatado}`
    case 'diminui':
      return `- ${valorFormatado}`
    case 'nenhum':
    default:
      return `( ${valorFormatado} )`
  }
}

export function obterTotalComplemento(complemento: ComplementoSelecionado): number {
  const tipo = complemento.tipoImpactoPreco || 'nenhum'
  if (tipo === 'nenhum') {
    return 0
  }
  return complemento.valor * complemento.quantidade
}

export function calcularTotalComplementos(produto: ProdutoSelecionado): number {
  return produto.complementos.reduce((sum, comp) => {
    const tipo = comp.tipoImpactoPreco || 'nenhum'
    const valorTotal = comp.valor * comp.quantidade * produto.quantidade

    if (tipo === 'aumenta') {
      return sum + valorTotal
    }
    if (tipo === 'diminui') {
      return sum - valorTotal
    }
    return sum
  }, 0)
}

export function calcularTotalProduto(produto: ProdutoSelecionado): number {
  const valorProduto = produto.valorUnitario * produto.quantidade
  const valorComplementos = calcularTotalComplementos(produto)
  const subtotal = valorProduto + valorComplementos

  let valorDesconto = 0
  if (produto.tipoDesconto && produto.valorDesconto) {
    valorDesconto =
      produto.tipoDesconto === 'porcentagem'
        ? subtotal * (produto.valorDesconto / 100)
        : produto.valorDesconto
  }

  let valorAcrescimo = 0
  if (produto.tipoAcrescimo && produto.valorAcrescimo) {
    valorAcrescimo =
      produto.tipoAcrescimo === 'porcentagem'
        ? subtotal * (produto.valorAcrescimo / 100)
        : produto.valorAcrescimo
  }

  return subtotal - valorDesconto + valorAcrescimo
}

export function formatarDescontoAcrescimo(produto: ProdutoSelecionado): string {
  if (produto.tipoDesconto && produto.valorDesconto) {
    if (produto.tipoDesconto === 'porcentagem') {
      const pct = produto.valorDesconto
      const pctFormatado = Number.isInteger(pct) ? String(pct) : formatarNumeroComMilhar(pct)
      return `-${pctFormatado}%`
    }
    const valorDesconto = produto.valorDesconto
    if (valorDesconto > 0) {
      return `-${formatarNumeroComMilhar(valorDesconto)}`
    }
  }

  if (produto.tipoAcrescimo && produto.valorAcrescimo) {
    if (produto.tipoAcrescimo === 'porcentagem') {
      const pct = produto.valorAcrescimo
      const pctFormatado = Number.isInteger(pct) ? String(pct) : formatarNumeroComMilhar(pct)
      return `+${pctFormatado}%`
    }
    const valorAcrescimo = produto.valorAcrescimo
    if (valorAcrescimo > 0) {
      return `+${formatarNumeroComMilhar(valorAcrescimo)}`
    }
  }

  return ''
}
