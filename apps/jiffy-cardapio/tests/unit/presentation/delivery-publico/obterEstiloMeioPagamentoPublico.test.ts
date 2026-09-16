import { describe, expect, it } from 'vitest'
import { obterEstiloMeioPagamentoPublico } from '@/src/presentation/components/features/delivery-publico/shared/utils/obterEstiloMeioPagamentoPublico'

describe('obterEstiloMeioPagamentoPublico', () => {
  it('aplica paleta do gestor para dinheiro, pix e cartões/vales', () => {
    expect(
      obterEstiloMeioPagamentoPublico({
        nome: 'Dinheiro',
        formaPagamentoFiscal: 'dinheiro',
      }).backgroundColor
    ).toBe('#00B074')

    expect(
      obterEstiloMeioPagamentoPublico({
        nome: 'PIX',
        formaPagamentoFiscal: 'pix',
      }).backgroundColor
    ).toBe('#32BCAD')

    const credito = obterEstiloMeioPagamentoPublico({
      nome: 'Crédito',
      formaPagamentoFiscal: 'cartao_credito',
    })
    expect(credito.backgroundColor).toBe('#003366')
    expect(credito.labelColor).toBe('#B4DD2B')
    expect(credito.labelFontWeight).toBe(600)

    const debito = obterEstiloMeioPagamentoPublico({
      nome: 'Débito',
      formaPagamentoFiscal: 'cartao_debito',
    })
    expect(debito.backgroundColor).toBe('#003366')

    const vale = obterEstiloMeioPagamentoPublico({
      nome: 'Vale Refeição',
      formaPagamentoFiscal: 'vale_refeicao',
    })
    expect(vale.backgroundColor).toBe('#003366')
    expect(vale.iconColor).toBe('#B4DD2B')
  })

  it('infere pelo nome quando forma fiscal não vem', () => {
    expect(
      obterEstiloMeioPagamentoPublico({ nome: 'Pix Loja' }).backgroundColor
    ).toBe('#32BCAD')
  })
})
