import { describe, expect, it } from 'vitest'
import type { DeliveryCarrinhoItem } from '@/src/presentation/components/features/delivery-publico/shared/stores/deliveryCarrinhoStore'
import {
  montarPedidoPublico,
  type CheckoutFormData,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/montarPedidoPublico'

const item: DeliveryCarrinhoItem = {
  id: 'item-1',
  produtoId: 'produto-1',
  produtoNome: 'Produto',
  produtoImagemUrl: null,
  quantidade: 1,
  valorUnitario: 20,
  valorTotal: 20,
  observacoes: [],
  complementos: [],
  adicionadoEm: '2026-07-20T12:00:00.000Z',
}

function form(overrides: Partial<CheckoutFormData> = {}): CheckoutFormData {
  return {
    tipoEntrega: 'retirada',
    telefone: '(12) 99999-9999',
    telefonePaisIso2: 'BR',
    nome: 'Cliente Teste',
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
    modoTempo: 'imediato',
    slotInicio: '',
    slotFim: '',
    slotLabel: '',
    meioPagamentoId: '',
    trocoPara: null,
    observacaoPedido: '',
    ...overrides,
  }
}

function montar(overrides: Partial<CheckoutFormData> = {}) {
  return montarPedidoPublico({
    slug: 'loja-teste',
    itens: [item],
    total: 20,
    form: form(overrides),
  })
}

describe('montarPedidoPublico', () => {
  it('envia pedido imediato sem slots residuais', () => {
    const resultado = montar({
      modoTempo: 'imediato',
      slotInicio: '2026-07-21T15:00:00.000Z',
      slotFim: '2026-07-21T15:30:00.000Z',
      slotLabel: '12:00–12:30',
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.payload.modoTempo).toBe('imediato')
    expect(resultado.payload.slotInicio).toBeUndefined()
    expect(resultado.payload.slotFim).toBeUndefined()
  })

  it('envia início e fim do slot no pedido agendado', () => {
    const resultado = montar({
      modoTempo: 'agendado',
      slotInicio: '2026-07-21T15:00:00.000Z',
      slotFim: '2026-07-21T15:30:00.000Z',
      slotLabel: '12:00–12:30',
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.payload.modoTempo).toBe('agendado')
    expect(resultado.payload.slotInicio).toBe('2026-07-21T15:00:00.000Z')
    expect(resultado.payload.slotFim).toBe('2026-07-21T15:30:00.000Z')
  })

  it('rejeita pedido agendado sem horário', () => {
    expect(montar({ modoTempo: 'agendado', slotInicio: '' })).toEqual({
      ok: false,
      error: 'Selecione um horário para agendar',
    })
  })

  it('rejeita pedido sem modo de tempo', () => {
    expect(montar({ modoTempo: '' })).toEqual({
      ok: false,
      error: 'Informe quando deseja o pedido',
    })
  })
})
