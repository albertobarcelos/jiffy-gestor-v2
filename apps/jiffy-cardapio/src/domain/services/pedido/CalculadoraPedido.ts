import type { ComplementoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'

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
    const valorTotal = comp.valor * comp.quantidade

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
