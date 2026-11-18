import type {
  ComplementoPainelDTO,
  ProdutoLancadoPainelDTO,
  VendaPainelDetalheDTO,
} from '@/src/application/dto/VendaPainelDetalheDTO'
import {
  lerNumeroConfigAjusteVenda,
  multiplicadorPercentualContrato,
  tipoAjusteVendaInformado,
  tipoEhPercentual,
  valorRaizPositivo,
} from '@/src/application/mappers/VendaPainelDetalheMapper'

export function calcularValorComplemento(complemento: ComplementoPainelDTO): number {
  return complemento.valorUnitario * complemento.quantidade
}

export function calcularValorProduto(produto: ProdutoLancadoPainelDTO): number {
  let valor = produto.valorUnitario * produto.quantidade

  if (produto.desconto) {
    const descontoValue =
      typeof produto.desconto === 'string' ? parseFloat(produto.desconto) : produto.desconto
    if (produto.tipoDesconto === 'porcentagem') {
      valor -= valor * descontoValue
    } else {
      valor -= descontoValue
    }
  }

  if (produto.acrescimo) {
    const acrescimoValue =
      typeof produto.acrescimo === 'string' ? parseFloat(produto.acrescimo) : produto.acrescimo
    if (produto.tipoAcrescimo === 'porcentagem') {
      valor += valor * acrescimoValue
    } else {
      valor += acrescimoValue
    }
  }

  return valor
}

export function calcularValorBaseProdutoResumo(produto: ProdutoLancadoPainelDTO): number {
  return produto.valorUnitario * produto.quantidade
}

export type ResumoFinanceiroPainel = {
  totalItensLancados: number
  totalItensCancelados: number
  totalItensEfetivos: number
  totalTaxas: number
  totalAcrescimoVenda: number
  totalDescontoVenda: number
  totalResumo: number
}

export function calcularResumoFinanceiroPainel(
  venda: VendaPainelDetalheDTO | null
): ResumoFinanceiroPainel {
  if (!venda) {
    return {
      totalItensLancados: 0,
      totalItensCancelados: 0,
      totalItensEfetivos: 0,
      totalTaxas: 0,
      totalAcrescimoVenda: 0,
      totalDescontoVenda: 0,
      totalResumo: 0,
    }
  }

  const isVendaCancelada = !!venda.canceladoPorId
  const produtos = venda.produtosLancados ?? []

  let totalItensLancados = 0
  let totalItensCancelados = 0

  produtos.forEach(produto => {
    const valorTotalProduto = calcularValorBaseProdutoResumo(produto)
    let valorComplementos = 0
    if (produto.complementos && produto.complementos.length > 0) {
      produto.complementos.forEach(complemento => {
        if (complemento.tipoImpactoPreco === 'aumenta') {
          valorComplementos += calcularValorComplemento(complemento)
        } else if (complemento.tipoImpactoPreco === 'diminui') {
          valorComplementos -= calcularValorComplemento(complemento)
        }
      })
    }
    const valorTotalComComplementos = valorTotalProduto + valorComplementos
    totalItensLancados += valorTotalComComplementos
    if (isVendaCancelada || produto.removido) {
      totalItensCancelados += valorTotalComComplementos
    }
  })

  const totalItensEfetivos = totalItensLancados - totalItensCancelados
  const totalTaxas = (venda.taxasLancadas ?? []).reduce((acc, taxa) => {
    if (Boolean(taxa.dataRemocao?.trim())) return acc
    return acc + (Number(taxa.valorCalculado) || 0)
  }, 0)
  const totalAcrescimoVenda = valorRaizPositivo(venda.totalAcrescimo) ?? 0
  const totalDescontoVenda = valorRaizPositivo(venda.totalDesconto) ?? 0

  return {
    totalItensLancados,
    totalItensCancelados,
    totalItensEfetivos,
    totalTaxas,
    totalAcrescimoVenda,
    totalDescontoVenda,
    totalResumo: totalItensEfetivos + totalTaxas + totalAcrescimoVenda - totalDescontoVenda,
  }
}

export function calcularTrocoPainel(venda: VendaPainelDetalheDTO | null): number {
  if (!venda?.pagamentos?.length) return 0

  const pagamentosValidos = venda.pagamentos.filter(p => {
    const isCancelado =
      p.cancelado === true || (p.dataCancelamento !== null && p.dataCancelamento !== undefined)
    if (p.isTefUsed === true && p.isTefConfirmed !== true) return false
    return !isCancelado
  })

  const totalPago = pagamentosValidos.reduce((sum, pagamento) => sum + pagamento.valor, 0)
  return Math.max(0, totalPago - venda.valorFinal)
}

export type AjustesTotaisVendaPainel = {
  mostrarSecao: boolean
  temDesconto: boolean
  temAcrescimo: boolean
  valorDescontoExibir: number | null
  valorAcrescimoExibir: number | null
}

export function calcularAjustesTotaisVendaPainel(
  venda: VendaPainelDetalheDTO | null
): AjustesTotaisVendaPainel {
  if (!venda) {
    return {
      mostrarSecao: false,
      temDesconto: false,
      temAcrescimo: false,
      valorDescontoExibir: null,
      valorAcrescimoExibir: null,
    }
  }

  let base = 0
  for (const produto of venda.produtosLancados ?? []) {
    let valorComplementos = 0
    if (produto.complementos?.length) {
      produto.complementos.forEach(complemento => {
        if (complemento.tipoImpactoPreco === 'aumenta') {
          valorComplementos += calcularValorComplemento(complemento)
        } else if (complemento.tipoImpactoPreco === 'diminui') {
          valorComplementos -= calcularValorComplemento(complemento)
        }
      })
    }
    base += calcularValorProduto(produto) + valorComplementos
  }

  let valorDescontoExibir: number | null = null
  let temDesconto = false
  if (tipoAjusteVendaInformado(venda.tipoDesconto)) {
    if (tipoEhPercentual(venda.tipoDesconto)) {
      const taxa = lerNumeroConfigAjusteVenda(venda.valorDesconto)
      if (taxa != null) {
        valorDescontoExibir = Math.round(base * multiplicadorPercentualContrato(taxa) * 100) / 100
        temDesconto = true
      }
    } else {
      valorDescontoExibir = valorRaizPositivo(venda.valorDesconto)
      temDesconto = valorDescontoExibir != null
    }
  }

  let valorAcrescimoExibir: number | null = null
  let temAcrescimo = false
  if (tipoAjusteVendaInformado(venda.tipoAcrescimo)) {
    if (tipoEhPercentual(venda.tipoAcrescimo)) {
      const taxa = lerNumeroConfigAjusteVenda(venda.valorAcrescimo)
      if (taxa != null) {
        valorAcrescimoExibir = Math.round(base * multiplicadorPercentualContrato(taxa) * 100) / 100
        temAcrescimo = true
      }
    } else {
      valorAcrescimoExibir = valorRaizPositivo(venda.valorAcrescimo)
      temAcrescimo = valorAcrescimoExibir != null
    }
  }

  return {
    mostrarSecao: temDesconto || temAcrescimo,
    temDesconto,
    temAcrescimo,
    valorDescontoExibir,
    valorAcrescimoExibir,
  }
}

export function statusVendaPainel(venda: VendaPainelDetalheDTO): 'CANCELADA' | 'FINALIZADA' | 'EM ABERTO' {
  if (venda.canceladoPorId) return 'CANCELADA'
  if (venda.dataFinalizacao) return 'FINALIZADA'
  return 'EM ABERTO'
}

export function statusVendaPainelColor(status: 'CANCELADA' | 'FINALIZADA' | 'EM ABERTO'): string {
  if (status === 'CANCELADA') return 'bg-error'
  if (status === 'FINALIZADA') return 'bg-success'
  return 'bg-warning'
}
