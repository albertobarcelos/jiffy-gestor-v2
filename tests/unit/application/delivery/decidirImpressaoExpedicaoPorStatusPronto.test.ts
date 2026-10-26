import { describe, expect, it } from 'vitest'
import {
  decidirImpressaoExpedicaoNoPronto,
  deveImprimirCupomExpedicaoNesteCliente,
  lerResumoStatusDelivery,
} from '@/src/application/delivery/decidirImpressaoExpedicaoPorStatusPronto'

const estacoes = [
  { id: 'balcao', gestorDelivery: false },
  { id: 'expedicao', gestorDelivery: true },
]

describe('lerResumoStatusDelivery', () => {
  it('lê vendaId e statusDelivery do summary', () => {
    expect(
      lerResumoStatusDelivery({ vendaId: 'v-1', statusDelivery: 'PRONTO' })
    ).toEqual({ vendaId: 'v-1', statusDelivery: 'PRONTO' })
  })

  it('aceita id e alias de coluna', () => {
    expect(
      lerResumoStatusDelivery({ data: { id: 'v-2', statusEtapaOperacional: 'PRONTO_ENTREGA' } })
    ).toEqual({ vendaId: 'v-2', statusDelivery: 'PRONTO_ENTREGA' })
  })

  it('devolve vazio sem payload', () => {
    expect(lerResumoStatusDelivery(null)).toEqual({ vendaId: null, statusDelivery: null })
  })
})

describe('deveImprimirCupomExpedicaoNesteCliente', () => {
  it('imprime no PC e ignora o app do entregador', () => {
    expect(deveImprimirCupomExpedicaoNesteCliente(false)).toBe(true)
    expect(deveImprimirCupomExpedicaoNesteCliente(true)).toBe(false)
  })
})

describe('decidirImpressaoExpedicaoNoPronto', () => {
  it('imprime quando este PC é a receptora e o status é PRONTO', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: 'expedicao',
        estacoes,
        statusDelivery: 'PRONTO',
      })
    ).toEqual({ imprimir: true, receptoraId: 'expedicao' })
  })

  it('não imprime se este PC não for a receptora', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: 'balcao',
        estacoes,
        statusDelivery: 'PRONTO',
      })
    ).toEqual({ imprimir: false, receptoraId: 'expedicao' })
  })

  it('não imprime sem estação neste PC', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: null,
        estacoes,
        statusDelivery: 'PRONTO',
      })
    ).toEqual({ imprimir: false, receptoraId: 'expedicao' })
  })

  it('não imprime em outro status', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: 'expedicao',
        estacoes,
        statusDelivery: 'EM_PREPARO',
      }).imprimir
    ).toBe(false)
  })
})
