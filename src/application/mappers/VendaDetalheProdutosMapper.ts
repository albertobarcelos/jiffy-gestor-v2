import {
  normalizarDescontoAcrescimoPorcentagem,
  normalizeTipoImpactoPreco,
} from '@/src/application/mappers/VendaApiNormalizer'
import type { ComplementoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'
import type { ResumoFinanceiroDetalhes } from '@/src/domain/types/vendaDetalhe'
import { textoObservacaoProdutoApi } from '@/src/shared/helpers/observacaoPedido'

function mapComplementoRaw(comp: Record<string, unknown>): ComplementoSelecionado {
  return {
    id: String(comp.complementoId ?? comp.id ?? ''),
    grupoId: String(comp.grupoComplementoId ?? comp.grupoId ?? ''),
    nome: String(comp.nomeComplemento ?? comp.nome ?? 'Complemento'),
    valor: Number(comp.valorUnitario ?? comp.valor) || 0,
    quantidade: Number(comp.quantidade) || 1,
    tipoImpactoPreco: normalizeTipoImpactoPreco(comp.tipoImpactoPreco),
  }
}

/** Mapeia um item bruto de produtoLancado/produtos do GET venda para ProdutoSelecionado. */
export function mapProdutoDetalheVenda(prod: Record<string, unknown>): ProdutoSelecionado {
  const nomeProduto = String(prod.nomeProduto ?? prod.nome ?? 'Produto sem nome')

  const complementosMapeados: ComplementoSelecionado[] = Array.isArray(prod.complementos)
    ? prod.complementos.map((comp: unknown) =>
        mapComplementoRaw(comp as Record<string, unknown>)
      )
    : []

  let tipoDescontoFinal = (prod.tipoDesconto as ProdutoSelecionado['tipoDesconto']) || null
  let valorDescontoFinal: number | null =
    typeof prod.valorDesconto === 'string'
      ? parseFloat(prod.valorDesconto)
      : prod.valorDesconto != null
        ? Number(prod.valorDesconto)
        : null
  let tipoAcrescimoFinal = (prod.tipoAcrescimo as ProdutoSelecionado['tipoAcrescimo']) || null
  let valorAcrescimoFinal: number | null =
    typeof prod.valorAcrescimo === 'string'
      ? parseFloat(prod.valorAcrescimo)
      : prod.valorAcrescimo != null
        ? Number(prod.valorAcrescimo)
        : null

  const quantidade = Number(prod.quantidade) || 1
  const valorProdutoSubtotal = (Number(prod.valorUnitario) || 0) * quantidade
  const valorComplementosSubtotal = complementosMapeados.reduce((sum, comp) => {
    const tipo = comp.tipoImpactoPreco || 'nenhum'
    const valorTotal = comp.valor * comp.quantidade * quantidade
    if (tipo === 'aumenta') return sum + valorTotal
    if (tipo === 'diminui') return sum - valorTotal
    return sum
  }, 0)
  const subtotalProduto = valorProdutoSubtotal + valorComplementosSubtotal

  valorDescontoFinal = normalizarDescontoAcrescimoPorcentagem(
    tipoDescontoFinal,
    valorDescontoFinal,
    subtotalProduto
  )
  valorAcrescimoFinal = normalizarDescontoAcrescimoPorcentagem(
    tipoAcrescimoFinal,
    valorAcrescimoFinal,
    subtotalProduto
  )

  if (
    valorDescontoFinal !== null &&
    valorDescontoFinal !== undefined &&
    valorDescontoFinal > 0 &&
    valorDescontoFinal < 1 &&
    tipoDescontoFinal !== 'porcentagem'
  ) {
    tipoDescontoFinal = 'porcentagem'
    valorDescontoFinal = Math.round(valorDescontoFinal * 1000) / 10
  }
  if (
    valorAcrescimoFinal !== null &&
    valorAcrescimoFinal !== undefined &&
    valorAcrescimoFinal > 0 &&
    valorAcrescimoFinal < 1 &&
    tipoAcrescimoFinal !== 'porcentagem'
  ) {
    tipoAcrescimoFinal = 'porcentagem'
    valorAcrescimoFinal = Math.round(valorAcrescimoFinal * 1000) / 10
  }

  const valorFinalProduto =
    prod.valorFinal !== undefined && prod.valorFinal !== null
      ? Number(prod.valorFinal)
      : prod.valor_final !== undefined && prod.valor_final !== null
        ? Number(prod.valor_final)
        : null

  return {
    produtoId: String(prod.produtoId ?? prod.id ?? ''),
    nome: nomeProduto,
    quantidade,
    valorUnitario: Number(prod.valorUnitario) || 0,
    complementos: complementosMapeados,
    tipoDesconto: tipoDescontoFinal,
    valorDesconto: valorDescontoFinal,
    tipoAcrescimo: tipoAcrescimoFinal,
    valorAcrescimo: valorAcrescimoFinal,
    valorFinal: valorFinalProduto,
    lancadoPorId: prod.lancadoPorId != null ? String(prod.lancadoPorId) : undefined,
    removido: Boolean(prod.removido),
    removidoPorId: prod.removidoPorId != null ? String(prod.removidoPorId) : undefined,
    dataLancamento: prod.dataLancamento != null ? String(prod.dataLancamento) : undefined,
    dataRemocao: prod.dataRemocao != null ? String(prod.dataRemocao) : undefined,
    ncm: prod.ncm != null ? String(prod.ncm) : undefined,
    observacao: textoObservacaoProdutoApi(prod) || undefined,
  }
}

export interface ProdutosDetalheVendaResult {
  produtos: ProdutoSelecionado[]
  produtosTodos: ProdutoSelecionado[]
  resumoFinanceiroDetalhes: ResumoFinanceiroDetalhes | null
  totalDosItensResumo: number | null
}

/** Mapeia produtosLancados/produtos do GET venda e calcula resumo financeiro. */
export function mapProdutosDetalheVenda(
  vendaData: Record<string, unknown>
): ProdutosDetalheVendaResult {
  const produtosRaw = vendaData.produtosLancados ?? vendaData.produtos

  if (!Array.isArray(produtosRaw) || produtosRaw.length === 0) {
    return {
      produtos: [],
      produtosTodos: [],
      resumoFinanceiroDetalhes: null,
      totalDosItensResumo: null,
    }
  }

  const produtosMapeadosTodos = produtosRaw.map((prod: unknown) =>
    mapProdutoDetalheVenda(prod as Record<string, unknown>)
  )
  const produtos = produtosMapeadosTodos.filter(prod => !prod.removido)

  const vendaCancelada = Boolean(vendaData.dataCancelamento || vendaData.canceladoPorId)
  let totalItensLancados = 0
  let totalItensCancelados = 0
  let totalDescontosConta = 0
  let totalAcrescimosConta = 0

  produtosMapeadosTodos.forEach(produto => {
    const valorBaseProduto = produto.valorUnitario * produto.quantidade
    const valorComplementos = (produto.complementos || []).reduce((sum, comp) => {
      const tipo = comp.tipoImpactoPreco || 'nenhum'
      const valorTotal = comp.valor * comp.quantidade * produto.quantidade
      if (tipo === 'aumenta') return sum + valorTotal
      if (tipo === 'diminui') return sum - valorTotal
      return sum
    }, 0)
    const subtotal = valorBaseProduto + valorComplementos

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

    totalDescontosConta += valorDesconto
    totalAcrescimosConta += valorAcrescimo

    const totalLinha = produto.valorFinal ?? subtotal - valorDesconto + valorAcrescimo
    totalItensLancados += totalLinha
    if (vendaCancelada || produto.removido) {
      totalItensCancelados += totalLinha
    }
  })

  const resumoFinanceiroDetalhes: ResumoFinanceiroDetalhes = {
    totalItensLancados,
    totalTaxasEntrega: 0,
    totalItensCancelados,
    totalDosItens: totalItensLancados - totalItensCancelados,
    totalDescontosConta,
    totalAcrescimosConta,
  }

  return {
    produtos,
    produtosTodos: produtosMapeadosTodos,
    resumoFinanceiroDetalhes,
    totalDosItensResumo: totalItensLancados - totalItensCancelados,
  }
}

/** Aplica total de taxas de entrega ao resumo financeiro já calculado. */
export function aplicarTaxaEntregaAoResumoFinanceiro(
  resumo: ResumoFinanceiroDetalhes | null,
  totalTaxasEntrega: number
): ResumoFinanceiroDetalhes | null {
  if (totalTaxasEntrega <= 0 || !resumo) return resumo

  return {
    ...resumo,
    totalTaxasEntrega,
    totalDosItens: resumo.totalItensLancados + totalTaxasEntrega - resumo.totalItensCancelados,
  }
}
