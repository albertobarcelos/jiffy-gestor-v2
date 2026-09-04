import { describe, expect, it } from 'vitest'
import type { CheckoutFormData } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import { CreatePedidoPublicoInputSchema } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { montarPedidoPublico } from '@/src/application/mappers/MontarPedidoPublicoMapper'
import {
  calcularTrocoCheckout,
  pagamentosCobremTotalCheckout,
  resolverAdicaoPagamentoCheckout,
} from '@/src/application/services/delivery-publico/checkoutPagamentos'

function formBase(overrides: Partial<CheckoutFormData> = {}): CheckoutFormData {
  return {
    tipoEntrega: 'retirada',
    telefone: '11999999999',
    telefonePaisIso2: 'BR',
    nome: 'Cliente Teste',
    modoEndereco: 'existente',
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
    apelidoEndereco: '',
    pagamentos: [{ meioPagamentoId: 'meio-pix', valor: 30.5 }],
    observacaoPedido: '',
    cpfNotaFiscal: '',
    modoTempo: 'imediato',
    ...overrides,
  }
}

const item = {
  produtoId: 'p1',
  quantidade: 1,
  observacoes: [] as string[],
  complementos: [],
}

describe('montarPedidoPublico + CreatePedidoPublicoInputSchema', () => {
  it('monta payload válido segundo o schema Zod', () => {
    const result = montarPedidoPublico({
      slug: 'loja',
      itens: [item],
      total: 30.5,
      form: formBase(),
      tokenCotacao: 'token-teste',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const parsed = CreatePedidoPublicoInputSchema.safeParse(result.payload)
    expect(parsed.success).toBe(true)
  })

  it('inclui CPF no cliente e documento quando completo', () => {
    const result = montarPedidoPublico({
      slug: 'loja',
      itens: [item],
      total: 30.5,
      form: formBase({ cpfNotaFiscal: '123.456.789-09' }),
      tokenCotacao: 'token-teste',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.documentoCpfCnpj).toBe('12345678909')
    expect(result.payload.cliente).toEqual({ telefone: '11999999999' })
    expect(CreatePedidoPublicoInputSchema.safeParse(result.payload).success).toBe(true)
  })

  it('rejeita CPF incompleto na montagem', () => {
    const result = montarPedidoPublico({
      slug: 'loja',
      itens: [item],
      total: 30.5,
      form: formBase({ cpfNotaFiscal: '123' }),
      tokenCotacao: 'token-teste',
    })
    expect(result.ok).toBe(false)
  })
})

describe('checkoutPagamentos (application)', () => {
  const isDinheiro = (id: string) => id === 'dinheiro'

  it('calcula troco no último lançamento em dinheiro', () => {
    expect(
      calcularTrocoCheckout(
        30,
        [
          { meioPagamentoId: 'pix', valor: 10 },
          { meioPagamentoId: 'dinheiro', valor: 50 },
        ],
        isDinheiro
      )
    ).toBe(30)
  })

  it('aceita cobertura com overpayment em dinheiro', () => {
    expect(
      pagamentosCobremTotalCheckout(
        30,
        [{ meioPagamentoId: 'dinheiro', valor: 50 }],
        isDinheiro
      )
    ).toBe(true)
  })

  it('resolve adição com cédula para troco', () => {
    const resolved = resolverAdicaoPagamentoCheckout({
      restante: 30,
      valorPagamento: null,
      ehDinheiro: true,
      precisaTroco: true,
      valorCedula: 50,
    })
    expect(resolved).toEqual({
      ok: true,
      valorLancamento: 50,
      trocoReceber: 20,
    })
  })
})
