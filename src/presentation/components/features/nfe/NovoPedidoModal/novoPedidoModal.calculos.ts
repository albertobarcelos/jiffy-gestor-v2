import type { ProdutoSelecionado } from './novoPedidoModal.types'

export function formatarNumeroComMilhar(valor: number): string {
  if (valor === 0) return '0,00'
  const partes = valor.toFixed(2).split('.')
  const parteInteira = partes[0]
  const parteDecimal = partes[1]
  const parteInteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${parteInteiraFormatada},${parteDecimal}`
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
  const valorComplementos = produto.complementos.reduce((sum, comp) => {
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
  const subtotal = valorProduto + valorComplementos
  let valorDesconto = 0
  if (produto.tipoDesconto && produto.valorDesconto) {
    if (produto.tipoDesconto === 'porcentagem') {
      valorDesconto = subtotal * (produto.valorDesconto / 100)
    } else {
      valorDesconto = produto.valorDesconto
    }
  }
  let valorAcrescimo = 0
  if (produto.tipoAcrescimo && produto.valorAcrescimo) {
    if (produto.tipoAcrescimo === 'porcentagem') {
      valorAcrescimo = subtotal * (produto.valorAcrescimo / 100)
    } else {
      valorAcrescimo = produto.valorAcrescimo
    }
  }
  return subtotal - valorDesconto + valorAcrescimo
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

export function formatarDescontoAcrescimo(produto: ProdutoSelecionado): string {
  const valorProduto = produto.valorUnitario * produto.quantidade
  const valorComplementos = calcularTotalComplementos(produto)
  const subtotal = valorProduto + valorComplementos
  if (produto.tipoDesconto && produto.valorDesconto) {
    if (produto.tipoDesconto === 'porcentagem') {
      const pct = produto.valorDesconto
      return `Desc. ${Number.isInteger(pct) ? pct : formatarNumeroComMilhar(pct)}%`
    }
    const valorDesconto = produto.valorDesconto
    if (valorDesconto > 0) {
      return `Desc. -${formatarNumeroComMilhar(valorDesconto)}`
    }
  }
  if (produto.tipoAcrescimo && produto.valorAcrescimo) {
    if (produto.tipoAcrescimo === 'porcentagem') {
      const pct = produto.valorAcrescimo
      return `Acres. ${Number.isInteger(pct) ? pct : formatarNumeroComMilhar(pct)}%`
    }
    const valorAcrescimo = produto.valorAcrescimo
    if (valorAcrescimo > 0) {
      return `Acres. +${formatarNumeroComMilhar(valorAcrescimo)}`
    }
  }
  return ''
}

export function formatarDataHoraResumoFiscal(valor: string | null | undefined): string {
  if (valor == null || String(valor).trim() === '') return '—'
  try {
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return String(valor)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(valor)
  }
}

export function formatarDataDetalhePedido(valor: string | null | undefined): string {
  if (!valor || String(valor).trim() === '') return '—'
  try {
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function rotuloModeloNfe(modelo: number | null | undefined): string {
  if (modelo === 55) return 'NF-e'
  if (modelo === 65) return 'NFC-e'
  if (modelo == null || modelo === undefined) return '—'
  return String(modelo)
}

export function formatarValorRecebido(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, '')
  if (apenasNumeros === '') return ''
  const valorCentavos = parseInt(apenasNumeros, 10)
  const valorReais = valorCentavos / 100
  return formatarNumeroComMilhar(valorReais)
}
