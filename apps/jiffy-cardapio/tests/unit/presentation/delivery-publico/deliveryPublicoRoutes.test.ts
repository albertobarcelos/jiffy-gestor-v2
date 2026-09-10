import { describe, expect, it } from 'vitest'
import {
  deliveryPublicoCarrinhoPath,
  deliveryPublicoHomePath,
  deliveryPublicoInstrucoesPath,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryPublicoRoutes'

describe('deliveryPublicoRoutes (cardapio)', () => {
  it('monta home, carrinho e instrucoes', () => {
    expect(deliveryPublicoHomePath('loja')).toBe('/loja')
    expect(deliveryPublicoCarrinhoPath('loja')).toBe('/loja/carrinho')
    expect(deliveryPublicoInstrucoesPath()).toBe('/instrucoes')
  })
})
