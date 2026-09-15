import { describe, expect, it } from 'vitest'
import { isPedidoEntregaKanban } from '@/src/shared/helpers/pedidoEntregaKanban'

describe('isPedidoEntregaKanban', () => {
  it('reconhece entrega, retirada e delivery do gestor', () => {
    expect(isPedidoEntregaKanban('venda_gestor', 'entrega')).toBe(true)
    expect(isPedidoEntregaKanban('venda_gestor', 'retirada')).toBe(true)
    expect(isPedidoEntregaKanban('venda_gestor', 'delivery')).toBe(true)
  })

  it('não trata balcão/mesa como delivery', () => {
    expect(isPedidoEntregaKanban('venda_gestor', 'balcao')).toBe(false)
    expect(isPedidoEntregaKanban('venda_gestor', 'mesa')).toBe(false)
    expect(isPedidoEntregaKanban('venda', 'entrega')).toBe(false)
  })
})
