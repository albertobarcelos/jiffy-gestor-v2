import { describe, expect, it } from 'vitest'
import {
  montarFechamentoCaixaEstacaoRelatorio,
  RODAPE_FECHAMENTO_CAIXA_TAGLINE,
} from '@/src/application/caixa-estacao/fechamentoCaixaEstacaoRelatorio'
import { mapOperacaoCaixaEstacaoToPrintDocument } from '@/src/application/caixa-estacao/mapOperacaoCaixaEstacaoToPrintDocument'

const operacaoBase = {
  id: 'op-1',
  status: 'fechado' as const,
  empresaId: 'emp',
  abertoPorAtor: { id: '1', type: 'user', sourceReference: 'u', nome: 'Admin II' },
  estacao: { id: 'est', nome: 'Chrome' },
  dataAbertura: '2026-09-26T18:38:00.000Z',
  dataFechamento: '2026-09-26T18:40:00.000Z',
  fechadoPorAtor: { id: '1', type: 'user', sourceReference: 'u', nome: 'Admin II' },
  nomeEmpresa: 'GREGORIO FOOD',
  resumoCaixa: { totalSuprimento: 100, totalSangria: 0, valorLiquidoDinheiroCaixa: 200 },
  resumoPagamentos: {
    total: 106.8,
    totalLiquido: 106.8,
    totalDinheiro: 100,
    totalTroco: 0,
    meiosPagamento: [
      { nomeMeioPagamento: 'Dinheiro', valorContabilizado: 100 },
      { nomeMeioPagamento: 'Credito', valorContabilizado: 6.8 },
    ],
  },
  resumoFechamento: {
    valorFornecido: 195,
    diferencaValorFornecidoEValorCaixa: -5,
    tempoOperacaoInSeconds: 100,
    dataFechamento: '2026-09-26T18:40:00.000Z',
    fechadoPorAtor: { id: '1', type: 'user', sourceReference: 'u', nome: 'Admin II' },
  },
}

describe('montarFechamentoCaixaEstacaoRelatorio', () => {
  it('inclui cabeçalho, usuários e seções unificadas', () => {
    const relatorio = montarFechamentoCaixaEstacaoRelatorio(operacaoBase)

    expect(relatorio.titulo).toBe('Relatório do Caixa')
    expect(relatorio.subtitulo).toBe('FECHAMENTO DE CAIXA')
    expect(relatorio.abertura).toContain('Admin II')
    expect(relatorio.fechamento).toContain('Admin II')
    expect(relatorio.resumoCaixa?.saldoEsperadoDinheiro).toBe(200)
    expect(relatorio.resumoCaixa?.recebimentosDinheiro).toBe(100)
    expect(relatorio.resumoRecebimentos?.meios[0]?.nome).toBe('DINHEIRO')
    expect(relatorio.conferencia?.valorEsperado).toBe(200)
    expect(relatorio.conferencia?.valorContado).toBe(195)
    expect(relatorio.conferencia?.diferenca).toBe(-5)
    expect(relatorio.nomeCaixa).toBe('Chrome')
  })
})

describe('mapOperacaoCaixaEstacaoToPrintDocument', () => {
  it('espelha o relatório na impressão térmica', () => {
    const doc = mapOperacaoCaixaEstacaoToPrintDocument(operacaoBase)
    const textos = doc.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
    const rows = doc.content
      .filter((b): b is { type: 'row'; left: string; right: string } => b.type === 'row')
      .map(b => ({ left: b.left, right: b.right }))

    expect(textos).toContain('Relatório do Caixa')
    expect(textos).toContain('FECHAMENTO DE CAIXA')
    expect(textos).toContain('RESUMO CAIXA')
    expect(textos).toContain('RESUMO RECEBIMENTOS')
    expect(textos).toContain('CONFERÊNCIA')
    expect(rows.some(r => r.left === 'Abertura:' && r.right.includes('Admin II'))).toBe(true)
    expect(rows.some(r => r.left === 'Fechamento:' && r.right.includes('Admin II'))).toBe(true)
    expect(rows.some(r => r.left === 'SALDO ESPERADO:')).toBe(true)
    expect(rows.some(r => r.left === 'RECEB. EM DIN.:')).toBe(true)
    expect(rows.some(r => r.left === 'DINHEIRO:')).toBe(true)
    expect(rows.some(r => r.left === 'Valor esperado:')).toBe(true)
    expect(rows.some(r => r.left === 'Valor contado:')).toBe(true)
    expect(textos).toContain('Caixa: Chrome')
    expect(textos).toContain(RODAPE_FECHAMENTO_CAIXA_TAGLINE)
    expect(textos.some(t => t.includes('Estação:'))).toBe(false)
    expect(textos.some(t => t.includes('Desenvolvido por Jiffy'))).toBe(false)
  })
})
