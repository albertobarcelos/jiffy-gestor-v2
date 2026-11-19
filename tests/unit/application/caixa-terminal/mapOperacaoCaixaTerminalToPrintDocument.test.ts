import { describe, expect, it } from 'vitest'
import { RODAPE_FECHAMENTO_CAIXA_TAGLINE } from '@/src/application/caixa-estacao/fechamentoCaixaEstacaoRelatorio'
import { mapOperacaoCaixaTerminalToPrintDocument } from '@/src/application/caixa-terminal/mapOperacaoCaixaTerminalToPrintDocument'

const operacaoBase = {
  id: 'op-term-1',
  status: 'fechado' as const,
  empresaId: 'emp',
  abertoPorId: 'pdv-1',
  terminalId: 'term-1',
  codigoTerminal: 'T01',
  nomeTerminal: 'Caixa 1',
  dataAbertura: '2026-09-26T18:38:00.000Z',
  dataFechamento: '2026-09-26T18:40:00.000Z',
  nomeResponsavelFechamento: 'Operador PDV',
  nomeEmpresa: 'GREGORIO FOOD',
  resumoCaixa: {
    totalSuprimento: 100,
    totalSangria: 0,
    valorLiquidoDinheiroCaixa: 200,
  },
  resumoPagamentos: {
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
    responsavelFechamento: 'Operador PDV',
  },
}

describe('mapOperacaoCaixaTerminalToPrintDocument', () => {
  it('gera cupom térmico com seções principais', () => {
    const doc = mapOperacaoCaixaTerminalToPrintDocument(operacaoBase)
    const textos = doc.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)

    expect(doc.type).toBe('CAIXA_FECHAMENTO')
    expect(textos).toContain('Relatório do Caixa')
    expect(textos).toContain('FECHAMENTO DE CAIXA')
    expect(textos).toContain('RESUMO RECEBIMENTOS')
    expect(textos).toContain('RESUMO CAIXA')
    expect(textos).toContain('CONFERÊNCIA')
    expect(textos.some(t => t.includes('Caixa 1') || t.includes('T01'))).toBe(true)
    expect(textos).toContain(RODAPE_FECHAMENTO_CAIXA_TAGLINE)
  })
})
