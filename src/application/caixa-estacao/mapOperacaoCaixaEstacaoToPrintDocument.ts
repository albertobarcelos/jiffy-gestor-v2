import type { OperacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import type { PrintContentBlock, PrintDocument } from '@/src/application/ports/printDocument'
import {
  formatarMoedaFechamentoCaixa,
  formatarMoedaFechamentoCaixaSinal,
  montarFechamentoCaixaEstacaoRelatorio,
  RODAPE_FECHAMENTO_CAIXA_TAGLINE,
} from '@/src/application/caixa-estacao/fechamentoCaixaEstacaoRelatorio'

const COLS = 48

function pushText(
  content: PrintContentBlock[],
  text: string,
  opts?: { align?: 'left' | 'center' | 'right'; bold?: boolean; size?: 'small' | 'normal' }
) {
  content.push({ type: 'text', text, ...opts })
}

function pushRow(content: PrintContentBlock[], left: string, right: string, bold = true) {
  content.push({ type: 'row', left, right, bold })
}

/** Layout térmico de fechamento — espelha a tela de detalhes. */
export function mapOperacaoCaixaEstacaoToPrintDocument(
  operacao: OperacaoCaixaEstacaoDTO
): PrintDocument {
  const relatorio = montarFechamentoCaixaEstacaoRelatorio(operacao)
  const content: PrintContentBlock[] = []

  pushText(content, relatorio.titulo, { align: 'center', bold: true })
  pushText(content, relatorio.empresa, { align: 'center' })
  content.push({ type: 'divider', style: 'double' })
  pushText(content, relatorio.subtitulo, { align: 'center', bold: true })
  content.push({ type: 'divider', style: 'double' })

  pushRow(content, 'Abertura:', relatorio.aberturaImpressao)
  pushRow(content, 'Fechamento:', relatorio.fechamentoImpressao)
  if (relatorio.tempoOperacao) {
    pushRow(content, 'Tempo op.:', relatorio.tempoOperacao)
  }
  content.push({ type: 'divider' })

  if (relatorio.resumoRecebimentos) {
    pushText(content, 'RESUMO RECEBIMENTOS', { bold: true })
    if (relatorio.resumoRecebimentos.meios.length === 0) {
      pushRow(content, '—:', formatarMoedaFechamentoCaixa(0))
    } else {
      for (const meio of relatorio.resumoRecebimentos.meios) {
        pushRow(content, `${meio.nome}:`, formatarMoedaFechamentoCaixa(meio.valor))
      }
    }
    content.push({ type: 'divider' })
    pushRow(
      content,
      'TOT. LIQUIDO:',
      formatarMoedaFechamentoCaixa(relatorio.resumoRecebimentos.totalLiquido),
      true
    )
    content.push({ type: 'divider' })
  }

  if (relatorio.resumoCaixa) {
    pushText(content, 'RESUMO CAIXA', { bold: true })
    pushRow(
      content,
      'RECEB. EM DIN.:',
      formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.recebimentosDinheiro)
    )
    pushRow(
      content,
      'TOT. SANGRIAS:',
      `-${formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.totalSangrias)}`
    )
    pushRow(
      content,
      'TOT. SUPRIMENTOS:',
      `+${formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.totalSuprimentos)}`
    )
    pushRow(
      content,
      'TOT. TROCO:',
      `-${formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.totalTroco)}`
    )
    content.push({ type: 'divider' })
    pushRow(
      content,
      'SALDO ESPERADO:',
      formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.saldoEsperadoDinheiro),
      true
    )
    content.push({ type: 'divider' })
  }

  if (relatorio.conferencia) {
    pushText(content, 'CONFERÊNCIA', { bold: true })
    pushRow(
      content,
      'Valor esperado:',
      formatarMoedaFechamentoCaixa(relatorio.conferencia.valorEsperado)
    )
    pushRow(
      content,
      'Valor contado:',
      formatarMoedaFechamentoCaixa(relatorio.conferencia.valorContado)
    )
    pushRow(
      content,
      'Diferença:',
      formatarMoedaFechamentoCaixaSinal(relatorio.conferencia.diferenca)
    )
    content.push({ type: 'divider' })
  }

  content.push({ type: 'divider' })
  pushText(content, `Caixa: ${relatorio.nomeCaixa}`, { align: 'center', bold: true, size: 'small' })
  pushText(content, RODAPE_FECHAMENTO_CAIXA_TAGLINE, {
    align: 'center',
    bold: true,
    size: 'small',
  })
  content.push({ type: 'feed', lines: 4 })
  content.push({ type: 'cut' })

  return {
    type: 'CAIXA_FECHAMENTO',
    columns: COLS,
    content,
  }
}
