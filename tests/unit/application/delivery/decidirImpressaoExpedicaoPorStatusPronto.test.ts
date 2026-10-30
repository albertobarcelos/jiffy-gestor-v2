import { describe, expect, it } from 'vitest'
import {
  decidirImpressaoExpedicaoNoPronto,
  deveImprimirCupomExpedicaoNesteCliente,
  lerResumoStatusDelivery,
} from '@/src/application/delivery/decidirImpressaoExpedicaoPorStatusPronto'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'

const estacoes = [
  { id: 'balcao', gestorDelivery: false },
  { id: 'expedicao', gestorDelivery: true },
]

const prefsSeparadoLigado = {
  ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
  modo: 'separado' as const,
  imprimirAoFicarPronto: true,
}

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
        prefs: prefsSeparadoLigado,
      })
    ).toEqual({ imprimir: true, receptoraId: 'expedicao' })
  })

  it('não imprime se a opção de expedição ao marcar pronto estiver desligada', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: 'expedicao',
        estacoes,
        statusDelivery: 'PRONTO',
        prefs: { ...prefsSeparadoLigado, imprimirAoFicarPronto: false },
      })
    ).toEqual({ imprimir: false, receptoraId: 'expedicao' })
  })

  it('não imprime no modo unificado', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: 'expedicao',
        estacoes,
        statusDelivery: 'PRONTO',
        prefs: { ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY, modo: 'unificado', imprimirAoFicarPronto: true },
      })
    ).toEqual({ imprimir: false, receptoraId: 'expedicao' })
  })

  it('não imprime se este PC não for a receptora', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: 'balcao',
        estacoes,
        statusDelivery: 'PRONTO',
        prefs: prefsSeparadoLigado,
      })
    ).toEqual({ imprimir: false, receptoraId: 'expedicao' })
  })

  it('não imprime sem estação neste PC', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: null,
        estacoes,
        statusDelivery: 'PRONTO',
        prefs: prefsSeparadoLigado,
      })
    ).toEqual({ imprimir: false, receptoraId: 'expedicao' })
  })

  it('não imprime em outro status', () => {
    expect(
      decidirImpressaoExpedicaoNoPronto({
        estacaoDestePcId: 'expedicao',
        estacoes,
        statusDelivery: 'EM_PREPARO',
        prefs: prefsSeparadoLigado,
      }).imprimir
    ).toBe(false)
  })
})
