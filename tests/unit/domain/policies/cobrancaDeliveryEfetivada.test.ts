import { describe, expect, it } from 'vitest'
import {
  cobrancaDeliveryCobraNaEntrega,
  cobrancaDeliveryEstaEfetivada,
} from '@/src/domain/policies/pedido/cobrancaDeliveryEfetivada'

describe('cobrancaDeliveryEstaEfetivada', () => {
  it('não trata lançamento na entrega como pago', () => {
    expect(
      cobrancaDeliveryEstaEfetivada({
        status: 'pendente',
        momentoCobranca: 'na_entrega',
        temPagamentoEfetivado: true,
      })
    ).toBe(false)
    expect(
      cobrancaDeliveryEstaEfetivada({
        momentoCobranca: 'na_entrega',
        temPagamentoEfetivado: true,
      })
    ).toBe(false)
    expect(cobrancaDeliveryCobraNaEntrega({ status: 'pendente', momentoCobranca: 'na_entrega' })).toBe(
      true
    )
  })

  it('só marca efetivado quando a cobrança foi quitada', () => {
    expect(cobrancaDeliveryEstaEfetivada({ status: 'paga', momentoCobranca: 'na_entrega' })).toBe(true)
    expect(cobrancaDeliveryEstaEfetivada({ status: 'paga', momentoCobranca: 'antecipado' })).toBe(true)
    expect(cobrancaDeliveryEstaEfetivada({ temPagamentoEfetivado: true })).toBe(true)
    expect(cobrancaDeliveryCobraNaEntrega({ status: 'paga', momentoCobranca: 'na_entrega' })).toBe(
      false
    )
  })

  it('antecipado pendente na API já foi pago na loja', () => {
    expect(
      cobrancaDeliveryEstaEfetivada({
        status: 'pendente',
        momentoCobranca: 'antecipado',
      })
    ).toBe(true)
    expect(
      cobrancaDeliveryCobraNaEntrega({
        status: 'pendente',
        momentoCobranca: 'antecipado',
      })
    ).toBe(false)
  })
})
