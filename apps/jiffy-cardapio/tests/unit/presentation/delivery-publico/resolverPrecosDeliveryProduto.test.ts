import { describe, expect, it } from 'vitest'
import {
  descontoPercentualDelivery,
  resolverPrecosDeliveryProduto,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/resolverPrecosDeliveryProduto'

describe('resolverPrecosDeliveryProduto', () => {
  it('usa valor normal sem promoção', () => {
    expect(
      resolverPrecosDeliveryProduto({
        valor: 39.9,
        valorPromocional: 0,
        promocaoAtiva: false,
      })
    ).toEqual({
      preco: 39.9,
      precoRegular: null,
      descontoPercentual: null,
    })
  })

  it('expõe promo vigente com regular e %', () => {
    const r = resolverPrecosDeliveryProduto({
      valor: 39.9,
      valorPromocional: 27.93,
      promocaoAtiva: true,
      valorVigente: 27.93,
    })
    expect(r.preco).toBe(27.93)
    expect(r.precoRegular).toBe(39.9)
    expect(r.descontoPercentual).toBe(30)
  })

  it('ignora promo pausada', () => {
    expect(
      resolverPrecosDeliveryProduto({
        valor: 39.9,
        valorPromocional: 27.93,
        promocaoAtiva: false,
      })
    ).toEqual({
      preco: 39.9,
      precoRegular: null,
      descontoPercentual: null,
    })
  })
})

describe('descontoPercentualDelivery', () => {
  it('calcula percentual', () => {
    expect(descontoPercentualDelivery(100, 70)).toBe(30)
  })
})
