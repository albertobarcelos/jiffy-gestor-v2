import { describe, expect, it } from 'vitest'
import {
  buildDeliveryCheckoutPath,
  calculateDeliveryCheckoutProgress,
} from '@/src/presentation/components/features/delivery-publico/public/components/checkout/deliveryCheckoutProgress'

describe('deliveryCheckoutProgress', () => {
  it.each([
    {
      tipoEntrega: 'retirada' as const,
      modoTempo: 'imediato' as const,
      path: ['identificacao', 'recebimento', 'pagamento', 'revisao'],
    },
    {
      tipoEntrega: 'retirada' as const,
      modoTempo: 'agendado' as const,
      path: ['identificacao', 'recebimento', 'horario', 'pagamento', 'revisao'],
    },
    {
      tipoEntrega: 'entrega' as const,
      modoTempo: 'imediato' as const,
      path: ['identificacao', 'recebimento', 'endereco', 'pagamento', 'revisao'],
    },
    {
      tipoEntrega: 'entrega' as const,
      modoTempo: 'agendado' as const,
      path: ['identificacao', 'recebimento', 'endereco', 'horario', 'pagamento', 'revisao'],
    },
  ])('monta o caminho de $tipoEntrega $modoTempo', ({ tipoEntrega, modoTempo, path }) => {
    expect(buildDeliveryCheckoutPath(tipoEntrega, modoTempo)).toEqual(path)
  })

  it('usa o caminho máximo antes da escolha do recebimento', () => {
    expect(buildDeliveryCheckoutPath('retirada', '')).toEqual([
      'identificacao',
      'recebimento',
      'endereco',
      'horario',
      'pagamento',
      'revisao',
    ])

    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: 'tipoEntrega',
        tipoEntrega: 'retirada',
        modoTempo: '',
      })
    ).toMatchObject({
      current: 2,
      total: 6,
      percentage: 20,
    })
  })

  it('considera seleção e cadastro como a mesma etapa de endereço', () => {
    const params = {
      tipoEntrega: 'entrega' as const,
      modoTempo: 'agendado' as const,
    }

    const selecao = calculateDeliveryCheckoutProgress({
      ...params,
      checkoutStep: 'enderecos',
    })
    const cadastro = calculateDeliveryCheckoutProgress({
      ...params,
      checkoutStep: 'enderecoForm',
    })

    expect(selecao).toMatchObject({
      current: 3,
      total: 6,
      percentage: 40,
    })
    expect(cadastro).toMatchObject({
      current: 3,
      total: 6,
      percentage: 40,
    })
  })

  it('completa o círculo na revisão', () => {
    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: 'revisao',
        tipoEntrega: 'retirada',
        modoTempo: 'imediato',
      })
    ).toMatchObject({
      current: 4,
      total: 4,
      percentage: 100,
    })
  })

  it('preserva 100% ao editar uma etapa a partir da revisão', () => {
    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: 'telefone',
        tipoEntrega: 'entrega',
        modoTempo: 'agendado',
        preserveCompleted: true,
      })
    ).toMatchObject({
      current: 6,
      total: 6,
      percentage: 100,
    })
  })

  it('não retorna progresso quando o checkout está fechado', () => {
    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: null,
        tipoEntrega: 'retirada',
        modoTempo: '',
      })
    ).toBeNull()
  })
})
