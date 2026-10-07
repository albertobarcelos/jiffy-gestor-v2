import { describe, expect, it } from 'vitest'
import { parsePedidoDeliveryPublicoResponse } from '@/src/application/dto/delivery-publico/PedidoDeliveryPublicoDTO'
import { mapPedidoDeliveryPublicoParaConfirmado } from '@/src/application/mappers/PedidoPublicoConfirmadoMapper'

const pedidoRaw = {
  id: 'pedido-1',
  numeroVenda: 12,
  codigoVenda: 'A12',
  tipoEntrega: 'entrega',
  statusDelivery: 'PENDENTE',
  tempoTotalEstimadoSegundos: 1800,
  previsaoEntregaEm: '2026-10-06T20:00:00.000Z',
  documentoCpfCnpj: '123.456.789-09',
  clienteDelivery: { nome: 'Ana Silva', telefone: '65999999999' },
  contextoEntrega: {
    destinatarioNome: 'Ana',
    destinatarioTelefone: '65999999999',
    enderecoEntrega: {
      etiqueta: 'casa',
      rua: 'Rua das Flores',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Cuiabá',
      estado: 'MT',
      cep: '78000-000',
      complemento: 'apto 2',
    },
    enderecoLocalizacao: { type: 'Point', coordinates: [-56.1, -15.6] },
    localExatoEntrega: { type: 'Point', coordinates: [-56.11, -15.61] },
  },
  empresa: {
    nomeFantasia: 'Pizzaria',
    slug: 'pizzaria',
    telefone: '6533333333',
    segmento: 'comida',
    logoUrl: null,
    bannerUrl: null,
    exigeCpfVenda: false,
    endereco: {
      rua: 'Av. Central',
      numero: '100',
      bairro: 'Centro',
      cidade: 'Cuiabá',
      estado: 'MT',
      cep: '78000-000',
    },
    localizacao: { type: 'Point', coordinates: [-56.09, -15.59] },
  },
  telefoneWhatsapp: '65988888888',
  valorFinal: 42.5,
  taxaEntrega: 5,
  troco: 7.5,
  totalPago: 0,
  totalFaltaPagar: 42.5,
  dataCriacao: '2026-10-06T19:00:00.000Z',
  dataInicioPreparo: null,
  dataFinalizacaoPreparo: null,
  dataSaidaEntrega: null,
  dataFinalizacao: null,
  dataCancelamento: null,
  motivoCancelamento: null,
  sequenciaTransicoes: [
    { status: 'PENDENTE', realizadaEm: '2026-10-06T19:00:00.000Z', ordem: 1 },
  ],
  produtosLancados: [
    {
      nomeProduto: 'Pizza',
      quantidade: 1,
      valorUnitario: 37.5,
      valorFinal: 37.5,
      imagemUrl: 'https://cdn.example/pizza.png',
      complementos: [
        {
          nomeComplemento: 'Borda',
          quantidade: 1,
          valorUnitario: 0,
          tipoImpactoPreco: 'acrescimo',
        },
      ],
      observacoes: [{ observacao: 'sem cebola', dataLancamento: '2026-10-06T19:00:00.000Z' }],
    },
  ],
  cobrancas: [
    {
      valor: 50,
      momentoCobranca: 'na_entrega',
      status: 'pendente',
      meioPagamentoNome: 'Dinheiro',
      dataCriacao: '2026-10-06T19:00:00.000Z',
      dataCancelamento: null,
    },
  ],
  observacoes: [{ observacao: 'tocar a campainha', dataLancamento: '2026-10-06T19:00:00.000Z' }],
}

describe('pedido delivery público', () => {
  it('aceita o contrato do GET e monta a visão da confirmação', () => {
    const pedido = parsePedidoDeliveryPublicoResponse(pedidoRaw)
    const view = mapPedidoDeliveryPublicoParaConfirmado(pedido)

    expect(view.id).toBe('pedido-1')
    expect(view.statusDelivery).toBe('PENDENTE')
    expect(view.codigoVenda).toBe('A12')
    expect(view.slug).toBe('pizzaria')
    expect(view.nome).toBe('Ana Silva')
    expect(view.telefoneLoja).toBe('65988888888')
    expect(view.enderecoCliente?.rua).toBe('Rua das Flores')
    expect(view.enderecoCliente?.preferenciaEntrega?.coordinates).toEqual([-56.11, -15.61])
    expect(view.itens[0]?.produtoImagemUrl).toBe('https://cdn.example/pizza.png')
    expect(view.itens[0]?.observacoes).toEqual(['sem cebola'])
    expect(view.pagamentos[0]?.meio?.nome).toBe('Dinheiro')
    expect(view.total).toBe(42.5)
    expect(view.taxaEntrega).toBe(5)
    expect(view.subtotal).toBe(37.5)
    expect(view.troco).toBe(7.5)
    expect(view.observacaoPedido).toBe('tocar a campainha')
    expect(view.cpfNotaFiscal).toBe('12345678909')
    expect(view.enderecoEmpresaTexto).toContain('Av. Central')
  })

  it('rejeita payload sem o contrato público', () => {
    expect(() => parsePedidoDeliveryPublicoResponse({ id: 'pedido-1' })).toThrow(
      'Resposta do pedido inválida'
    )
  })
})
