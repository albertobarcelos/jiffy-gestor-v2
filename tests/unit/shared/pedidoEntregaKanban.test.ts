import { describe, expect, it } from 'vitest'
import {
  isPedidoEntregaComEntregador,
  isPedidoEntregaKanban,
} from '@/src/shared/helpers/pedidoEntregaKanban'

describe('isPedidoEntregaKanban', () => {
  it('só reconhece tipoVenda delivery do gestor', () => {
    expect(isPedidoEntregaKanban('venda_gestor', 'delivery')).toBe(true)
    expect(isPedidoEntregaKanban('venda_gestor', 'entrega')).toBe(false)
    expect(isPedidoEntregaKanban('venda_gestor', 'retirada')).toBe(false)
    expect(isPedidoEntregaKanban('venda_gestor', null)).toBe(false)
  })

  it('não trata balcão/mesa/POS como delivery', () => {
    expect(isPedidoEntregaKanban('venda_gestor', 'balcao')).toBe(false)
    expect(isPedidoEntregaKanban('venda_gestor', 'mesa')).toBe(false)
    expect(isPedidoEntregaKanban('venda', 'delivery')).toBe(false)
  })
})

describe('isPedidoEntregaComEntregador', () => {
  it('só tipoEntrega=entrega', () => {
    expect(isPedidoEntregaComEntregador('entrega')).toBe(true)
    expect(isPedidoEntregaComEntregador('retirada')).toBe(false)
    expect(isPedidoEntregaComEntregador(null)).toBe(false)
  })
})
