import { describe, expect, it } from 'vitest'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import {
  aplicarToggleCanalDelivery,
  montarCorpoPatchCanalDelivery,
} from '@/src/application/meios-pagamentos/toggleCanalDeliveryMeioPagamento'

function pixRetirada() {
  return MeioPagamento.create('mp-1', 'PIX', false, 'pix', true, false, null, false, true)
}

describe('toggleCanalDeliveryMeioPagamento', () => {
  it('PATCH manda só o canal tocado', () => {
    expect(montarCorpoPatchCanalDelivery('ativoEntregaDelivery', true)).toEqual({
      ativoEntregaDelivery: true,
    })
    expect(montarCorpoPatchCanalDelivery('ativoRetiradaDelivery', false)).toEqual({
      ativoRetiradaDelivery: false,
    })
  })

  it('ligar entrega não desliga retirada', () => {
    const next = aplicarToggleCanalDelivery(pixRetirada(), 'ativoEntregaDelivery', true)
    expect(next.isEntregaDelivery()).toBe(true)
    expect(next.isRetiradaDelivery()).toBe(true)
  })

  it('desligar retirada não liga entrega', () => {
    const next = aplicarToggleCanalDelivery(pixRetirada(), 'ativoRetiradaDelivery', false)
    expect(next.isEntregaDelivery()).toBe(false)
    expect(next.isRetiradaDelivery()).toBe(false)
  })
})
