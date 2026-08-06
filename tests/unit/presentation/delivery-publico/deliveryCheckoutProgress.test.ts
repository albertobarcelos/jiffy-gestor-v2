import { describe, expect, it } from 'vitest'
import {
  buildDeliveryCheckoutPath,
  calculateDeliveryCheckoutProgress,
  isIdentificacaoCheckoutCompleta,
  isNomeCompletoCheckoutValido,
} from '@/src/presentation/components/features/delivery-publico/public/components/checkout/deliveryCheckoutProgress'

describe('deliveryCheckoutProgress', () => {
  it('monta path de entrega sem etapa separada de tipo de entrega', () => {
    expect(buildDeliveryCheckoutPath('entrega')).toEqual([
      'identificacao',
      'endereco',
      'pagamento',
      'revisao',
    ])
  })

  it('monta path de retirada sem endereço', () => {
    expect(buildDeliveryCheckoutPath('retirada')).toEqual([
      'identificacao',
      'pagamento',
      'revisao',
    ])
  })

  it('na identificação incompleta percentual fica em 0', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'telefone',
      tipoEntrega: 'entrega',
      identificacaoCompleta: false,
    })
    expect(progress?.current).toBe(1)
    expect(progress?.total).toBe(4)
    expect(progress?.percentage).toBe(0)
  })

  it('na identificação completa sobe a barra (1 de 3 transições na entrega)', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'telefone',
      tipoEntrega: 'entrega',
      identificacaoCompleta: true,
    })
    expect(progress?.percentage).toBe(33)
    expect(progress?.current).toBe(2)
    expect(progress?.total).toBe(4)
  })

  it('na identificação completa na retirada sobe a barra (1 de 2 transições)', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'telefone',
      tipoEntrega: 'retirada',
      identificacaoCompleta: true,
    })
    expect(progress?.percentage).toBe(50)
    expect(progress?.total).toBe(3)
  })

  it('marca 100% na revisão', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'revisao',
      tipoEntrega: 'retirada',
    })
    expect(progress?.percentage).toBe(100)
  })

  it('omite progresso no step de sucesso', () => {
    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: 'sucesso',
        tipoEntrega: 'entrega',
      })
    ).toBeNull()
  })

  it('omite progresso no step de detalhes do pedido', () => {
    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: 'pedidoDetalhe',
        tipoEntrega: 'retirada',
      })
    ).toBeNull()
  })

  it('valida nome e sobrenome', () => {
    expect(isNomeCompletoCheckoutValido('Andre')).toBe(false)
    expect(isNomeCompletoCheckoutValido('Andre Silva')).toBe(true)
  })

  it('identificação completa com cliente cadastrado e nome', () => {
    expect(
      isIdentificacaoCheckoutCompleta({
        lookupStatus: 'encontrado',
        nomeCadastro: 'Andre Silva',
        nomeDigitado: '',
      })
    ).toBe(true)
  })

  it('identificação completa só com nome+sobrenome se cliente novo', () => {
    expect(
      isIdentificacaoCheckoutCompleta({
        lookupStatus: 'nao_encontrado',
        nomeCadastro: null,
        nomeDigitado: 'Andre',
      })
    ).toBe(false)
    expect(
      isIdentificacaoCheckoutCompleta({
        lookupStatus: 'nao_encontrado',
        nomeCadastro: null,
        nomeDigitado: 'Andre Silva',
      })
    ).toBe(true)
  })
})
