import { describe, expect, it } from 'vitest'
import { buildCriarPedidoDeliveryPayload } from '@/src/application/mappers/CriarPedidoDeliveryPayloadMapper'
import type { CriarPedidoDeliveryInputDTO } from '@/src/application/dto/CriarPedidoDeliveryDTO'
import { TAXA_ENTREGA_SEM_TAXA_ID } from '@/src/shared/constants/taxaEntregaPedido'

function baseInput(
  overrides: Partial<CriarPedidoDeliveryInputDTO> = {}
): CriarPedidoDeliveryInputDTO {
  return {
    tipoInicioPedido: 'entrega',
    origem: 'GESTOR',
    status: 'ABERTA',
    produtos: [
      {
        produtoId: 'prod-1',
        quantidade: 1,
        valorUnitario: 24,
        valorCatalogo: 24,
        permiteAlterarPreco: false,
        valorDesconto: null,
        valorAcrescimo: null,
        tipoDesconto: null,
        tipoAcrescimo: null,
        complementos: [],
      },
    ],
    pagamentos: [{ meioPagamentoId: 'mp-1', valor: 24 }],
    totalProdutos: 24,
    totalPagamentos: 24,
    totalPagamentosLancados: 24,
    tipoAtendimentoDelivery: 'entrega',
    tempoPrevistoMinutos: 30,
    pedidoComEntrega: false,
    valorTaxaEntrega: 0,
    entregaComCobrancaPeloEntregador: false,
    valorRecebido: '',
    trocoLancamento: 0,
    statusPagamentoPedido: 'pago',
    valorAPagar: 0,
    meiosPagamento: [],
    nomesMeiosPagamentoPedido: {},
    ...overrides,
  }
}

describe('CriarPedidoDeliveryPayloadMapper', () => {
  it('confirma pagamento antecipado quando já foi pago', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({ entregaComCobrancaPeloEntregador: false })
    )

    expect(payload.cobrancas).toEqual([
      {
        meioPagamentoId: 'mp-1',
        valor: 24,
        momentoCobranca: 'antecipado',
        pagamentoEfetivado: { confirmar: true },
      },
    ])
  })

  it('não confirma cobrança na entrega quando entregador vai cobrar', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({ entregaComCobrancaPeloEntregador: true })
    )

    expect(payload.cobrancas).toEqual([
      {
        meioPagamentoId: 'mp-1',
        valor: 24,
        momentoCobranca: 'na_entrega',
      },
    ])
  })

  it('omite valorTaxaEntrega na automática — o backend calcula a cobertura', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        pedidoComEntrega: true,
        taxaEntregaId: '',
        taxaEntregaCoberturaValor: 8,
        valorTaxaEntrega: 8,
        totalProdutos: 29,
        pagamentos: [{ meioPagamentoId: 'mp-1', valor: 29 }],
        totalPagamentos: 29,
        totalPagamentosLancados: 29,
      })
    )

    expect(payload.taxas).toBeUndefined()
    expect(payload.valorTaxaEntrega).toBeUndefined()
    expect(payload.cobrancas?.[0]?.valor).toBe(29)
  })

  it('não envia cliente.nome — a API rejeita a chave com Zod strict', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        telefoneCliente: '65999998888',
        clienteEntregaVinculado: { id: 'cli-1', nome: 'Maria Silva' },
      })
    )

    expect(payload.cliente).toEqual({ telefone: '65999998888' })
    expect(payload.cliente).not.toHaveProperty('nome')
  })

  it('envia enderecoIdEntrega quando morada selecionada possui id', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        pedidoComEntrega: true,
        telefoneCliente: '65999998888',
        moradaEntregaSelecionada: {
          id: 'endereco-delivery-1',
          telefone: '65999998888',
          tipoEtiqueta: 'casa',
          endereco: {
            cep: '79002000',
            rua: 'Rua A',
            numero: '100',
            bairro: 'Centro',
            cidade: 'Campo Grande',
            estado: 'MS',
          },
        },
      })
    )

    expect(payload.cliente.enderecoIdEntrega).toBe('endereco-delivery-1')
    expect(payload.cliente.enderecos).toBeUndefined()
  })

  it('não envia enderecos bootstrap — o create usa só enderecoIdEntrega', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        pedidoComEntrega: true,
        telefoneCliente: '65999998888',
        moradaEntregaSelecionada: {
          id: '',
          telefone: '65999998888',
          tipoEtiqueta: 'casa',
          endereco: {
            cep: '79002000',
            rua: 'Rua Nova',
            numero: '50',
            bairro: 'Centro',
            cidade: 'Campo Grande',
            estado: 'MS',
          },
        },
      })
    )

    expect(payload.cliente.enderecoIdEntrega).toBeUndefined()
    expect(payload.cliente.enderecos).toBeUndefined()
  })

  it('envia valorTaxaEntrega 0 quando o atendente remove a taxa', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        pedidoComEntrega: true,
        taxaEntregaId: TAXA_ENTREGA_SEM_TAXA_ID,
        taxaEntregaCoberturaValor: 8,
        valorTaxaEntrega: 0,
      })
    )

    expect(payload.taxas).toBeUndefined()
    expect(payload.valorTaxaEntrega).toBe(0)
  })

  it('envia o valor do catálogo no override', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        pedidoComEntrega: true,
        taxaEntregaId: 'taxa-catalogo-1',
        valorTaxaEntrega: 15,
      })
    )

    expect(payload.taxas).toBeUndefined()
    expect(payload.valorTaxaEntrega).toBe(15)
  })

  it('envia valorUnitario alterado nos produtos', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        produtos: [
          {
            produtoId: 'prod-1',
            quantidade: 2,
            valorUnitario: 19.9,
            valorCatalogo: 24,
            permiteAlterarPreco: true,
            valorDesconto: null,
            valorAcrescimo: null,
            tipoDesconto: null,
            tipoAcrescimo: null,
            complementos: [],
          },
        ],
      })
    )

    expect(payload.produtos[0]).toMatchObject({
      produtoId: 'prod-1',
      quantidade: 2,
      valorUnitario: 19.9,
    })
  })

  it('não envia valorUnitario quando preço não foi alterado', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        produtos: [
          {
            produtoId: 'prod-1',
            quantidade: 1,
            valorUnitario: 24,
            valorCatalogo: 24,
            permiteAlterarPreco: true,
            valorDesconto: null,
            valorAcrescimo: null,
            tipoDesconto: null,
            tipoAcrescimo: null,
            complementos: [],
          },
        ],
      })
    )

    expect(payload.produtos[0].valorUnitario).toBeUndefined()
  })
})
