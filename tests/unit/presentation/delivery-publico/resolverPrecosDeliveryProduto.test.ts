import { describe, expect, it } from 'vitest'
import { resolverPrecosDeliveryProduto } from '@/src/presentation/components/features/delivery-publico/shared/utils/resolverPrecosDeliveryProduto'

describe('resolverPrecosDeliveryProduto', () => {
  it('reexporta a policy de preço vigente do snapshot', () => {
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
})
