import { describe, expect, it } from 'vitest'
import {
  buildDeliveryCheckoutPath,
  calculateDeliveryCheckoutProgress,
} from '@/src/presentation/components/features/delivery-publico/public/components/checkout/deliveryCheckoutProgress'

describe('deliveryCheckoutProgress', () => {
  it('monta path de entrega sem etapa de horário', () => {
    expect(buildDeliveryCheckoutPath('entrega')).toEqual([
      'identificacao',
      'recebimento',
      'endereco',
      'pagamento',
      'revisao',
    ])
  })

  it('monta path de retirada sem endereço', () => {
    expect(buildDeliveryCheckoutPath('retirada')).toEqual([
      'identificacao',
      'recebimento',
      'pagamento',
      'revisao',
    ])
  })

  it('calcula percentual na identificação', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'telefone',
      tipoEntrega: 'entrega',
    })
    expect(progress?.current).toBe(1)
    expect(progress?.percentage).toBe(0)
  })

  it('marca 100% na revisão', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'revisao',
      tipoEntrega: 'retirada',
    })
    expect(progress?.percentage).toBe(100)
  })
})
