import { describe, expect, it } from 'vitest'
import {
  buildDeliveryCheckoutPath,
  calculateDeliveryCheckoutProgress,
  isIdentificacaoCheckoutCompleta,
  isNomeCompletoCheckoutValido,
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

  it('na identificação incompleta percentual fica em 0', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'telefone',
      tipoEntrega: 'entrega',
      identificacaoCompleta: false,
    })
    expect(progress?.current).toBe(1)
    expect(progress?.percentage).toBe(0)
  })

  it('na identificação completa sobe a barra (passo 1)', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'telefone',
      tipoEntrega: 'entrega',
      identificacaoCompleta: true,
    })
    expect(progress?.percentage).toBe(25)
    expect(progress?.current).toBe(2)
  })

  it('marca 100% na revisão', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'revisao',
      tipoEntrega: 'retirada',
    })
    expect(progress?.percentage).toBe(100)
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
