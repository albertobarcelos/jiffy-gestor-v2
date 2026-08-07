import { describe, expect, it } from 'vitest'
import {
  buildDeliveryCheckoutPath,
  calculateDeliveryCheckoutProgress,
  isIdentificacaoCheckoutCompleta,
  isNomeCompletoCheckoutValido,
} from '@/src/presentation/components/features/delivery-publico/public/components/checkout/deliveryCheckoutProgress'

describe('deliveryCheckoutProgress', () => {
  it.each([
    {
      tipoEntrega: 'retirada' as const,
      modoTempo: 'imediato' as const,
      path: ['identificacao', 'pagamento', 'revisao'],
    },
    {
      tipoEntrega: 'retirada' as const,
      modoTempo: 'agendado' as const,
      path: ['identificacao', 'horario', 'pagamento', 'revisao'],
    },
    {
      tipoEntrega: 'entrega' as const,
      modoTempo: 'imediato' as const,
      path: ['identificacao', 'endereco', 'pagamento', 'revisao'],
    },
    {
      tipoEntrega: 'entrega' as const,
      modoTempo: 'agendado' as const,
      path: ['identificacao', 'endereco', 'horario', 'pagamento', 'revisao'],
    },
  ])('monta o caminho de $tipoEntrega $modoTempo', ({ tipoEntrega, modoTempo, path }) => {
    expect(buildDeliveryCheckoutPath(tipoEntrega, modoTempo)).toEqual(path)
  })

  it('usa o caminho máximo antes da escolha do recebimento', () => {
    expect(buildDeliveryCheckoutPath('retirada', '')).toEqual([
      'identificacao',
      'endereco',
      'horario',
      'pagamento',
      'revisao',
    ])

    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: 'telefone',
        tipoEntrega: 'retirada',
        modoTempo: '',
        identificacaoCompleta: true,
      })
    ).toMatchObject({
      current: 2,
      total: 5,
      percentage: 25,
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
      current: 2,
      total: 5,
      percentage: 25,
    })
    expect(cadastro).toMatchObject({
      current: 2,
      total: 5,
      percentage: 25,
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
      current: 3,
      total: 3,
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
      current: 5,
      total: 5,
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

  it('na identificação incompleta percentual fica em 0', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'telefone',
      tipoEntrega: 'entrega',
      modoTempo: 'imediato',
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
      modoTempo: 'imediato',
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
      modoTempo: 'imediato',
      identificacaoCompleta: true,
    })
    expect(progress?.percentage).toBe(50)
    expect(progress?.total).toBe(3)
  })

  it('marca 100% na revisão', () => {
    const progress = calculateDeliveryCheckoutProgress({
      checkoutStep: 'revisao',
      tipoEntrega: 'retirada',
      modoTempo: 'imediato',
    })
    expect(progress?.percentage).toBe(100)
  })

  it('omite progresso no step de sucesso', () => {
    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: 'sucesso',
        tipoEntrega: 'entrega',
        modoTempo: 'imediato',
      })
    ).toBeNull()
  })

  it('omite progresso no step de detalhes do pedido', () => {
    expect(
      calculateDeliveryCheckoutProgress({
        checkoutStep: 'pedidoDetalhe',
        tipoEntrega: 'retirada',
        modoTempo: 'imediato',
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
