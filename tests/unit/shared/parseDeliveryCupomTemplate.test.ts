import { describe, expect, it } from 'vitest'
import { parseDeliveryCupomTemplate } from '@/src/shared/utils/parseDeliveryCupomTemplate'
import { DEFAULT_DELIVERY_CUPOM_TEMPLATE } from '@/src/shared/types/deliveryCupomTemplate'

describe('parseDeliveryCupomTemplate', () => {
  it('usa texto quando o modo não veio', () => {
    const parsed = parseDeliveryCupomTemplate({
      cupomDeliveryTemplate: { larguraMm: 58 },
    })
    expect(parsed.modoPapel).toBe('texto')
    expect(parsed.larguraMm).toBe(58)
  })

  it('lê negrito por bloco e usa o padrão quando não veio', () => {
    const parsed = parseDeliveryCupomTemplate({
      cupomDeliveryTemplate: {
        fontesPorModelo: {
          expedicao: { negritoPedido: true, negritoCabecalho: false },
        },
      },
    })
    expect(parsed.fontesPorModelo.expedicao.negritoPedido).toBe(true)
    expect(parsed.fontesPorModelo.expedicao.negritoCabecalho).toBe(false)
    expect(parsed.fontesPorModelo.expedicao.negritoItens).toBe(true)
    expect(parsed.fontesPorModelo.producao.negritoCabecalho).toBe(true)
  })

  it('sem template usa o padrão gráfico compacto', () => {
    const parsed = parseDeliveryCupomTemplate({})
    expect(parsed.modoPapel).toBe('grafico')
    expect(parsed.densidade).toBe('compacto')
    expect(parsed.fontesPorModelo.expedicao.tamanhoFonteCabecalho).toBe(8)
    expect(parsed.fontesPorModelo.expedicao.tamanhoFontePagamento).toBe(17)
    expect(parsed.fontesPorModelo.expedicao.tamanhoFonteRodape).toBe(14)
    expect(parsed.fontesPorModelo.producao.tamanhoFonteCabecalho).toBe(11)
    expect(parsed.fontesPorModelo.producao.tamanhoFonteItens).toBe(18)
  })

  it('aceita modo gráfico', () => {
    const parsed = parseDeliveryCupomTemplate({
      cupomDeliveryTemplate: { ...DEFAULT_DELIVERY_CUPOM_TEMPLATE, modoPapel: 'grafico' },
    })
    expect(parsed.modoPapel).toBe('grafico')
  })
})
