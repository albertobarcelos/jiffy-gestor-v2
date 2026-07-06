import ExcelJS from 'exceljs'
import {
  ajustarLarguraColunas,
  aplicarBordasLinha,
  aplicarEstiloCabecalhoTabela,
  aplicarEstiloSecao,
  aplicarEstiloTitulo,
  aplicarEstiloTotal,
  baixarExcelWorkbook,
  EXCEL_FMT,
} from './excelRelatorioHelpers'
import {
  calcularTotalCanceladoLista,
  calcularTotalTaxasLancadasAtivas,
  calcularValorCanceladoVenda,
  formatarDataHoraRelatorio,
  formatarDataHoraRelatorioNoFuso,
  formatarTaxasLancadasCelulaExport,
  obterStatusVendaLabel,
  obterTipoVendaLabel,
} from './vendasListCalculos'
import { extrairPeriodoIsoDosFiltros } from './vendasListQuery'
import { buildRelatorioVendasFilename } from './relatorioVendasFilename'
import {
  formatarFormasPagamentoCelulaExport,
} from './vendasPagamentoExport'
import type {
  MetodoPagamentoRelatorio,
  MetricasVendas,
  RelatorioVendasExportInput,
  VendaListItem,
  VendaListPagamentoItem,
  VendaListTaxaLancadaItem,
} from './vendasListTypes'

function adicionarTabelaCampoValor(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  tituloSecao: string,
  pares: Array<[string, string]>
): number {
  let row = startRow
  sheet.getCell(row, 1).value = tituloSecao
  aplicarEstiloSecao(sheet.getCell(row, 1))
  sheet.mergeCells(row, 1, row, 2)
  row++

  const headerRow = sheet.getRow(row)
  headerRow.getCell(1).value = 'Campo'
  headerRow.getCell(2).value = 'Valor'
  aplicarEstiloCabecalhoTabela(headerRow, 2)
  row++

  pares.forEach(([campo, valor], index) => {
    const dataRow = sheet.getRow(row)
    dataRow.getCell(1).value = campo
    dataRow.getCell(2).value = valor
    aplicarBordasLinha(dataRow, 2, index % 2 === 1)
    row++
  })

  return row
}

function adicionarSecaoEmpresa(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  input: RelatorioVendasExportInput
): number {
  const { contexto } = input
  const pares: Array<[string, string]> = [
    ['Nome', contexto.nomeEmpresa],
    ['CNPJ', contexto.cnpjEmpresa],
    ['Gerado por', contexto.usuarioGerador],
    ['Gerado em', formatarDataHoraRelatorio(new Date().toISOString())],
  ]
  return adicionarTabelaCampoValor(sheet, startRow, 'Empresa', pares)
}

function adicionarLinhasFiltros(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  input: RelatorioVendasExportInput
): number {
  const { filters, meiosPagamentoPorId, usuariosPorId, terminaisPorId, timeZoneEmpresa } = input
  const pares: Array<[string, string]> = []

  if (filters.periodo !== 'Todos') {
    pares.push(['Período', filters.periodo])
  }

  const { inicio, fim } = extrairPeriodoIsoDosFiltros(filters, timeZoneEmpresa)
  if (inicio && fim) {
    pares.push(['Data inicial', formatarDataHoraRelatorioNoFuso(inicio, timeZoneEmpresa)])
    pares.push(['Data final', formatarDataHoraRelatorioNoFuso(fim, timeZoneEmpresa)])
  } else if (filters.periodoInicial && filters.periodoFinal) {
    pares.push([
      'Data inicial',
      formatarDataHoraRelatorio(filters.periodoInicial.toISOString()),
    ])
    pares.push(['Data final', formatarDataHoraRelatorio(filters.periodoFinal.toISOString())])
  }

  if (filters.statusFilter) pares.push(['Status', filters.statusFilter])
  if (filters.tipoVendaFilter) pares.push(['Tipo venda', filters.tipoVendaFilter])
  if (filters.searchQuery) pares.push(['Busca', filters.searchQuery])
  if (filters.meioPagamentoFilter) {
    pares.push([
      'Meio pagamento',
      meiosPagamentoPorId.get(filters.meioPagamentoFilter) ?? filters.meioPagamentoFilter,
    ])
  }
  if (filters.usuarioAbertoPorFilter) {
    pares.push([
      'Usuário PDV',
      usuariosPorId.get(filters.usuarioAbertoPorFilter) ?? filters.usuarioAbertoPorFilter,
    ])
  }
  if (filters.terminalFilter) {
    pares.push([
      'Terminal',
      terminaisPorId.get(filters.terminalFilter) ?? filters.terminalFilter,
    ])
  }
  if (filters.valorMinimo) pares.push(['Valor mínimo', filters.valorMinimo])
  if (filters.valorMaximo) pares.push(['Valor máximo', filters.valorMaximo])

  return adicionarTabelaCampoValor(sheet, startRow, 'Filtros aplicados', pares)
}

function montarAbaResumo(
  workbook: ExcelJS.Workbook,
  input: RelatorioVendasExportInput,
  vendas: VendaListItem[],
  metricas: MetricasVendas | null,
  avisoPagamentos?: string
): void {
  const sheet = workbook.addWorksheet('Resumo', {
    views: [{ showGridLines: false }],
  })

  const totalCancelado = calcularTotalCanceladoLista(vendas)
  const efetivadas = metricas?.countVendasEfetivadas ?? 0
  const canceladas = metricas?.countVendasCanceladas ?? 0
  const produtos = metricas?.countProdutosVendidos ?? 0
  const faturado = metricas?.totalFaturado ?? 0

  const titulo = sheet.getCell(1, 1)
  titulo.value = 'Relatório de Vendas'
  aplicarEstiloTitulo(titulo)
  sheet.mergeCells(1, 1, 1, 2)

  let row = adicionarSecaoEmpresa(sheet, 3, input) + 1
  row = adicionarLinhasFiltros(sheet, row, input) + 1

  sheet.getCell(row, 1).value = 'Indicadores'
  aplicarEstiloSecao(sheet.getCell(row, 1))
  sheet.mergeCells(row, 1, row, 2)
  row++

  const indHeader = sheet.getRow(row)
  indHeader.getCell(1).value = 'Indicador'
  indHeader.getCell(2).value = 'Valor'
  aplicarEstiloCabecalhoTabela(indHeader, 2)
  row++

  const indicadores: Array<{ label: string; valor: string | number; moeda?: boolean; destaque?: boolean }> = [
    {
      label: input.filters.statusFilter === 'Aberta' ? 'Vendas em aberto' : 'Vendas finalizadas',
      valor: efetivadas,
    },
    { label: 'Vendas canceladas (qtd.)', valor: canceladas },
    { label: 'Produtos vendidos', valor: produtos },
    { label: 'Total faturado', valor: faturado, moeda: true, destaque: true },
    { label: 'Total cancelado (R$)', valor: totalCancelado, moeda: true, destaque: true },
    { label: 'Linhas exportadas', valor: vendas.length },
  ]

  indicadores.forEach((item, index) => {
    const dataRow = sheet.getRow(row)
    dataRow.getCell(1).value = item.label
    const valorCell = dataRow.getCell(2)
    valorCell.value = item.valor
    if (item.moeda) {
      valorCell.numFmt = EXCEL_FMT.moeda
    } else if (typeof item.valor === 'number') {
      valorCell.numFmt = EXCEL_FMT.inteiro
    }
    if (item.destaque) {
      aplicarEstiloTotal(dataRow, 2)
    } else {
      aplicarBordasLinha(dataRow, 2, index % 2 === 1)
    }
    row++
  })

  if (avisoPagamentos) {
    row++
    sheet.getCell(row, 1).value = 'Observação — formas de pagamento'
    aplicarEstiloSecao(sheet.getCell(row, 1))
    sheet.mergeCells(row, 1, row, 2)
    row++
    const avisoRow = sheet.getRow(row)
    avisoRow.getCell(1).value = avisoPagamentos
    sheet.mergeCells(row, 1, row, 2)
    avisoRow.getCell(1).alignment = { wrapText: true, vertical: 'top' }
    aplicarBordasLinha(avisoRow, 2)
    avisoRow.height = 36
  }

  ajustarLarguraColunas(sheet, { min: 14, max: 52 })
}

function montarAbaFormasPagamento(
  workbook: ExcelJS.Workbook,
  metodos: MetodoPagamentoRelatorio[]
): void {
  const sheet = workbook.addWorksheet('Formas de pagamento', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
  })

  const headers = ['Forma de pagamento', 'Quantidade', 'Valor (R$)', 'Percentual (%)', 'Forma fiscal']
  const headerRow = sheet.getRow(1)
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h
  })
  aplicarEstiloCabecalhoTabela(headerRow, headers.length)

  const totalValorPeriodo = metodos.reduce((s, m) => s + m.valor, 0)
  let totalQtd = 0

  metodos.forEach((item, index) => {
    const row = sheet.getRow(index + 2)
    row.getCell(1).value = item.metodo
    row.getCell(2).value = item.quantidade
    row.getCell(2).numFmt = EXCEL_FMT.inteiro
    row.getCell(3).value = item.valor
    row.getCell(3).numFmt = EXCEL_FMT.moeda
    // Proporção decimal (0–1); formato `0.00%` do Excel multiplica por 100 na exibição
    row.getCell(4).value = totalValorPeriodo > 0 ? item.valor / totalValorPeriodo : 0
    row.getCell(4).numFmt = EXCEL_FMT.percentual
    row.getCell(5).value = item.formaPagamentoFiscal ?? ''
    aplicarBordasLinha(row, headers.length, index % 2 === 1)
    totalQtd += item.quantidade
  })

  const totalRowNum = metodos.length + 2
  const totalRow = sheet.getRow(totalRowNum)
  totalRow.getCell(1).value = 'TOTAL'
  totalRow.getCell(2).value = totalQtd
  totalRow.getCell(2).numFmt = EXCEL_FMT.inteiro
  totalRow.getCell(3).value = totalValorPeriodo
  totalRow.getCell(3).numFmt = EXCEL_FMT.moeda
  totalRow.getCell(4).value = totalValorPeriodo > 0 ? 1 : 0
  totalRow.getCell(4).numFmt = EXCEL_FMT.percentual
  aplicarEstiloTotal(totalRow, headers.length)

  ajustarLarguraColunas(sheet)
}

function montarAbaVendas(
  workbook: ExcelJS.Workbook,
  vendas: VendaListItem[],
  usuariosPorId: Map<string, string>,
  pagamentosPorVendaId: Map<string, VendaListPagamentoItem[]>,
  quantidadeProdutosPorVendaId: Map<string, number>,
  taxasLancadasPorVendaId: Map<string, VendaListTaxaLancadaItem[]>,
  meiosPagamentoPorId: Map<string, string>
): void {
  const sheet = workbook.addWorksheet('Vendas', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
  })

  const headers = [
    'Código',
    'Data abertura',
    'Data finalização',
    'Status',
    'Tipo venda',
    'Qtd. produtos',
    'Terminal',
    'Usuário PDV',
    'Forma(s) de pagamento',
    'Taxas lançadas',
    'Valor taxas (R$)',
    'Valor cancelado (R$)',
    'Valor faturado (R$)',
  ]

  const headerRow = sheet.getRow(1)
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h
  })
  aplicarEstiloCabecalhoTabela(headerRow, headers.length)

  let somaCancelado = 0
  let somaFaturado = 0
  let somaProdutos = 0
  let somaTaxas = 0

  vendas.forEach((venda, index) => {
    const row = sheet.getRow(index + 2)
    const valorCancelado = calcularValorCanceladoVenda(venda)
    const valorFaturado = venda.dataCancelamento ? null : (venda.valorFinal ?? 0)
    const qtdProdutos = quantidadeProdutosPorVendaId.get(venda.id) ?? 0
    const taxasVenda = taxasLancadasPorVendaId.get(venda.id) ?? []
    const valorTaxas = calcularTotalTaxasLancadasAtivas(taxasVenda)

    row.getCell(1).value = venda.codigoVenda
    row.getCell(2).value = formatarDataHoraRelatorio(venda.dataCriacao)
    row.getCell(3).value = formatarDataHoraRelatorio(venda.dataFinalizacao)
    row.getCell(4).value = obterStatusVendaLabel(venda)
    row.getCell(5).value = obterTipoVendaLabel(venda)
    row.getCell(6).value = qtdProdutos
    row.getCell(6).numFmt = EXCEL_FMT.inteiro
    row.getCell(7).value = venda.codigoTerminal ?? ''
    row.getCell(8).value = usuariosPorId.get(venda.abertoPorId) ?? venda.abertoPorId

    const formasPagamento = formatarFormasPagamentoCelulaExport(
      pagamentosPorVendaId.get(venda.id),
      meiosPagamentoPorId,
      venda.metodoPagamento
    )
    const formasCell = row.getCell(9)
    formasCell.value = formasPagamento
    formasCell.alignment = { vertical: 'middle', wrapText: true }

    const taxasTexto = formatarTaxasLancadasCelulaExport(taxasVenda)
    const taxasCell = row.getCell(10)
    taxasCell.value = taxasTexto
    taxasCell.alignment = { vertical: 'middle', wrapText: true }

    if (valorTaxas > 0) {
      row.getCell(11).value = valorTaxas
      row.getCell(11).numFmt = EXCEL_FMT.moeda
      somaTaxas += valorTaxas
    } else {
      row.getCell(11).value = '—'
    }

    const linhasMultilinha = Math.max(
      formasPagamento.split('\n').length,
      taxasTexto.split('\n').length
    )
    row.height = Math.max(18, linhasMultilinha * 15 + 4)

    row.getCell(12).value = valorCancelado
    row.getCell(12).numFmt = EXCEL_FMT.moeda
    if (valorFaturado != null) {
      row.getCell(13).value = valorFaturado
      row.getCell(13).numFmt = EXCEL_FMT.moeda
      somaFaturado += valorFaturado
    } else {
      row.getCell(13).value = '—'
    }

    aplicarBordasLinha(row, headers.length, index % 2 === 1)
    somaCancelado += valorCancelado
    somaProdutos += qtdProdutos
  })

  const totalRowNum = vendas.length + 2
  const totalRow = sheet.getRow(totalRowNum)
  totalRow.getCell(1).value = 'TOTAL'
  sheet.mergeCells(totalRowNum, 1, totalRowNum, 5)
  totalRow.getCell(6).value = somaProdutos
  totalRow.getCell(6).numFmt = EXCEL_FMT.inteiro
  sheet.mergeCells(totalRowNum, 7, totalRowNum, 10)
  totalRow.getCell(11).value = somaTaxas
  totalRow.getCell(11).numFmt = EXCEL_FMT.moeda
  totalRow.getCell(12).value = somaCancelado
  totalRow.getCell(12).numFmt = EXCEL_FMT.moeda
  totalRow.getCell(13).value = somaFaturado
  totalRow.getCell(13).numFmt = EXCEL_FMT.moeda
  aplicarEstiloTotal(totalRow, headers.length)

  ajustarLarguraColunas(sheet, { min: 11, max: 44 })
}

export async function exportarRelatorioVendasXlsx(input: {
  exportInput: RelatorioVendasExportInput
  vendas: VendaListItem[]
  metricas: MetricasVendas | null
  metodosPagamento: MetodoPagamentoRelatorio[]
  pagamentosPorVendaId: Map<string, VendaListPagamentoItem[]>
  quantidadeProdutosPorVendaId: Map<string, number>
  taxasLancadasPorVendaId: Map<string, VendaListTaxaLancadaItem[]>
  avisoPagamentos?: string
}): Promise<void> {
  const {
    exportInput,
    vendas,
    metricas,
    metodosPagamento,
    pagamentosPorVendaId,
    quantidadeProdutosPorVendaId,
    taxasLancadasPorVendaId,
    avisoPagamentos,
  } = input

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Jiffy Gestor'
  workbook.created = new Date()

  montarAbaResumo(workbook, exportInput, vendas, metricas, avisoPagamentos)

  if (metodosPagamento.length > 0) {
    montarAbaFormasPagamento(workbook, metodosPagamento)
  }

  montarAbaVendas(
    workbook,
    vendas,
    exportInput.usuariosPorId,
    pagamentosPorVendaId,
    quantidadeProdutosPorVendaId,
    taxasLancadasPorVendaId,
    exportInput.meiosPagamentoPorId
  )

  await baixarExcelWorkbook(workbook, buildRelatorioVendasFilename(exportInput.filters))
}
