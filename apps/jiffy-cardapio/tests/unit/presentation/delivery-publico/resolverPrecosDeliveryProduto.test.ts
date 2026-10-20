import { describe, expect, it } from 'vitest'
import {
  descontoPercentualFromPrecos,
  resolverPrecosDeliveryProduto,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/resolverPrecosDeliveryProduto'

describe('resolverPrecosDeliveryProduto', () => {
  it('reexporta a policy compartilhada do snapshot', () => {
    expect(
      resolverPrecosDeliveryProduto({
        valor: 39.9,
        valorPromocional: 27.93,
        promocaoAtiva: true,
      })
    ).toEqual({
      preco: 27.93,
      precoRegular: 39.9,
      descontoPercentual: 30,
    })
  })

  it('ignora promo maior que o normal', () => {
    expect(
      resolverPrecosDeliveryProduto({
        valor: 20,
        valorPromocional: 25,
        promocaoAtiva: true,
      })
    ).toEqual({
      preco: 20,
      precoRegular: null,
      descontoPercentual: null,
    })
  })
})

describe('descontoPercentualFromPrecos', () => {
  it('calcula percentual pela mesma policy', () => {
    expect(descontoPercentualFromPrecos(100, 70)).toBe(30)
  })
})
