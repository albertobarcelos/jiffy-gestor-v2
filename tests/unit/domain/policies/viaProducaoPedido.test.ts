import { describe, expect, it } from 'vitest'
import {
  kindSlipPorUnidade,
  porUnidadeGeraConferencia,
  viaProducaoLevaSimboloPedido,
} from '@/src/domain/policies/impressao/viaProducaoPedido'

describe('viaProducaoPedido', () => {
  it('uma unidade não gera conferência e vira via do pedido', () => {
    expect(porUnidadeGeraConferencia(1)).toBe(false)
    expect(kindSlipPorUnidade(1)).toBe('single')
    expect(viaProducaoLevaSimboloPedido('single')).toBe(true)
  })

  it('várias unidades geram slips sem símbolo e conferência com símbolo', () => {
    expect(porUnidadeGeraConferencia(2)).toBe(true)
    expect(kindSlipPorUnidade(6)).toBe('unit')
    expect(viaProducaoLevaSimboloPedido('unit')).toBe(false)
    expect(viaProducaoLevaSimboloPedido('conference')).toBe(true)
  })
})
