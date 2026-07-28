import { describe, expect, it } from 'vitest'
import {
  calcularTrocoCheckout,
  calcularTrocoReceberCheckout,
  pagamentosCobremTotalCheckout,
  restantePagamentoCheckout,
  resolverAdicaoPagamentoCheckout,
  somaPagamentosCheckout,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/checkoutPagamentosUtils'
import { montarPedidoPublico } from '@/src/presentation/components/features/delivery-publico/shared/utils/montarPedidoPublico'
import type { DeliveryCarrinhoItem } from '@/src/presentation/components/features/delivery-publico/shared/stores/deliveryCarrinhoStore'
import type { CheckoutFormData } from '@/src/presentation/components/features/delivery-publico/shared/utils/montarPedidoPublico'

const itemCarrinho: DeliveryCarrinhoItem = {
  id: 'i1',
  produtoId: 'p1',
  produtoNome: 'Produto',
  produtoImagemUrl: null,
  quantidade: 1,
  valorUnitario: 30.5,
  valorTotal: 30.5,
  observacoes: [],
  complementos: [],
  adicionadoEm: '2026-01-01T00:00:00.000Z',
}

function formBase(overrides: Partial<CheckoutFormData> = {}): CheckoutFormData {
  return {
    tipoEntrega: 'retirada',
    telefone: '11999999999',
    telefonePaisIso2: 'BR',
    nome: 'Cliente',
    modoEndereco: 'novo',
    enderecoIdSelecionado: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    complemento: '',
    pontoReferencia: '',
    etiquetaEndereco: 'casa',
    apelidoEndereco: 'Casa',
    pagamentos: [],
    observacaoPedido: '',
    cpfNotaFiscal: '',
    modoTempo: 'imediato',
    ...overrides,
  }
}

const isDinheiro = (id: string) => id === 'dinheiro' || id === 'meio-dinheiro'

describe('checkoutPagamentosUtils', () => {
  it('calcula restante após lançamentos parciais', () => {
    expect(
      restantePagamentoCheckout(30.5, [
        { meioPagamentoId: 'pix', valor: 10 },
        { meioPagamentoId: 'dinheiro', valor: 5 },
      ])
    ).toBe(15.5)
  })

  it('zera restante quando dinheiro excede o total (cédula)', () => {
    expect(
      restantePagamentoCheckout(35, [{ meioPagamentoId: 'dinheiro', valor: 50 }])
    ).toBe(0)
  })

  it('considera total coberto com tolerância de centavos', () => {
    expect(
      pagamentosCobremTotalCheckout(30.5, [{ meioPagamentoId: 'pix', valor: 30.5 }])
    ).toBe(true)
    expect(
      pagamentosCobremTotalCheckout(30.5, [{ meioPagamentoId: 'pix', valor: 20 }])
    ).toBe(false)
  })

  it('considera coberto com overpayment de dinheiro', () => {
    expect(
      pagamentosCobremTotalCheckout(
        85,
        [
          { meioPagamentoId: 'debito', valor: 50 },
          { meioPagamentoId: 'dinheiro', valor: 50 },
        ],
        isDinheiro
      )
    ).toBe(true)
  })

  it('não cobre com overpayment sem dinheiro', () => {
    expect(
      pagamentosCobremTotalCheckout(
        85,
        [
          { meioPagamentoId: 'debito', valor: 50 },
          { meioPagamentoId: 'pix', valor: 50 },
        ],
        isDinheiro
      )
    ).toBe(false)
  })

  it('soma pagamentos', () => {
    expect(
      somaPagamentosCheckout([
        { meioPagamentoId: 'a', valor: 10 },
        { meioPagamentoId: 'b', valor: 2.5 },
      ])
    ).toBe(12.5)
  })

  it('calcula troco a partir dos lançamentos', () => {
    expect(
      calcularTrocoCheckout(
        85,
        [
          { meioPagamentoId: 'debito', valor: 50 },
          { meioPagamentoId: 'dinheiro', valor: 50 },
        ],
        isDinheiro
      )
    ).toBe(15)
  })
})

describe('resolverAdicaoPagamentoCheckout', () => {
  it('lança valor parcial sem ultrapassar o restante', () => {
    expect(
      resolverAdicaoPagamentoCheckout({
        restante: 85,
        valorPagamento: 50,
        ehDinheiro: false,
        precisaTroco: false,
        valorCedula: null,
      })
    ).toEqual({
      ok: true,
      valorLancamento: 50,
      trocoReceber: 0,
    })
  })

  it('bloqueia valor maior que o restante', () => {
    const r = resolverAdicaoPagamentoCheckout({
      restante: 35,
      valorPagamento: 50,
      ehDinheiro: false,
      precisaTroco: false,
      valorCedula: null,
    })
    expect(r.ok).toBe(false)
  })

  it('dinheiro sem troco lança o valor do pagamento', () => {
    expect(
      resolverAdicaoPagamentoCheckout({
        restante: 35,
        valorPagamento: 35,
        ehDinheiro: true,
        precisaTroco: false,
        valorCedula: null,
      })
    ).toEqual({
      ok: true,
      valorLancamento: 35,
      trocoReceber: 0,
    })
  })

  it('dinheiro com troco: cobrança = cédula e troco a receber', () => {
    expect(
      resolverAdicaoPagamentoCheckout({
        restante: 35,
        valorPagamento: null,
        ehDinheiro: true,
        precisaTroco: true,
        valorCedula: 50,
      })
    ).toEqual({
      ok: true,
      valorLancamento: 50,
      trocoReceber: 15,
    })
  })

  it('dinheiro com troco exige cédula maior que o restante', () => {
    const r = resolverAdicaoPagamentoCheckout({
      restante: 35,
      valorPagamento: null,
      ehDinheiro: true,
      precisaTroco: true,
      valorCedula: 35,
    })
    expect(r.ok).toBe(false)
  })

  it('prévia de troco usa o restante a cobrir', () => {
    expect(calcularTrocoReceberCheckout(50, 35)).toBe(15)
    expect(calcularTrocoReceberCheckout(30, 35)).toBe(0)
  })
})

describe('montarPedidoPublico cobrancas', () => {
  it('envia N cobranças com os valores lançados', () => {
    const result = montarPedidoPublico({
      slug: 'loja',
      itens: [itemCarrinho],
      total: 30.5,
      form: formBase({
        pagamentos: [
          { meioPagamentoId: 'meio-pix', valor: 20 },
          { meioPagamentoId: 'meio-dinheiro', valor: 10.5 },
        ],
      }),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.cobrancas).toEqual([
      { meioPagamentoId: 'meio-pix', valor: 20, momentoCobranca: 'na_entrega' },
      { meioPagamentoId: 'meio-dinheiro', valor: 10.5, momentoCobranca: 'na_entrega' },
    ])
  })

  it('envia cédula no valor da cobrança em dinheiro e não injeta troco em observações', () => {
    const result = montarPedidoPublico({
      slug: 'loja',
      itens: [itemCarrinho],
      total: 30.5,
      form: formBase({
        pagamentos: [{ meioPagamentoId: 'meio-dinheiro', valor: 50 }],
        observacaoPedido: 'Sem cebola',
      }),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.cobrancas).toEqual([
      { meioPagamentoId: 'meio-dinheiro', valor: 50, momentoCobranca: 'na_entrega' },
    ])
    expect(result.payload.observacoes).toEqual(['Sem cebola'])
    expect(
      (result.payload.observacoes ?? []).some(o =>
        String(o).toLowerCase().includes('troco')
      )
    ).toBe(false)
  })

  it('envia CPF no cliente e em documentoCpfCnpj quando completo', () => {
    const result = montarPedidoPublico({
      slug: 'loja',
      itens: [itemCarrinho],
      total: 30.5,
      form: formBase({
        pagamentos: [{ meioPagamentoId: 'meio-pix', valor: 30.5 }],
        cpfNotaFiscal: '123.456.789-09',
      }),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.cliente.cpf).toBe('12345678909')
    expect(result.payload.documentoCpfCnpj).toBe('12345678909')
  })

  it('bloqueia CPF incompleto', () => {
    const result = montarPedidoPublico({
      slug: 'loja',
      itens: [itemCarrinho],
      total: 30.5,
      form: formBase({
        pagamentos: [{ meioPagamentoId: 'meio-pix', valor: 30.5 }],
        cpfNotaFiscal: '123.456',
      }),
    })

    expect(result.ok).toBe(false)
  })

  it('aceita telefoneApi quando o input Celular está vazio', () => {
    const result = montarPedidoPublico({
      slug: 'loja',
      itens: [itemCarrinho],
      total: 30.5,
      form: formBase({
        telefone: '',
        pagamentos: [{ meioPagamentoId: 'meio-pix', valor: 30.5 }],
      }),
      telefoneApi: '11999999999',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.cliente.telefone).toBe('11999999999')
  })
})
