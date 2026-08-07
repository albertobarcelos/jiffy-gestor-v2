import { describe, expect, it } from 'vitest'
import { parseCreatePedidoPublicoResponse } from '@/src/application/dto/delivery-publico/CreatePedidoPublicoResponseDTO'
import { mapPedidoPublicoCriadoParaConfirmado } from '@/src/application/mappers/PedidoPublicoConfirmadoMapper'

describe('parseCreatePedidoPublicoResponse', () => {
  it('extrai campos relevantes do DTO expandido', () => {
    const parsed = parseCreatePedidoPublicoResponse({
      id: 'venda-1',
      codigoVenda: 'WMUTFISQ',
      numeroVenda: 12,
      tipoEntrega: 'entrega',
      pedidoAgendado: false,
      valorFinal: 42.5,
      documentoCpfCnpj: '12345678901',
      cliente: { id: 'c1', nome: 'Andre Silva' },
      contextoEntrega: {
        destinatarioNome: 'Andre Silva',
        destinatarioTelefone: '12999998888',
        destinatarioCpf: null,
        enderecoEntrega: {
          etiqueta: 'casa',
          rua: 'Rua A',
          numero: '10',
          bairro: 'Centro',
          cidade: 'Piquete',
          estado: 'SP',
          cep: '12620000',
          complemento: null,
        },
      },
      produtosLancados: [
        {
          id: 'pl-1',
          produtoId: 'prod-1',
          nomeProduto: 'X-Burger',
          quantidade: 2,
          valorUnitario: 20,
          valorFinal: 40,
          removido: false,
          complementos: [
            {
              complementoId: 'comp-1',
              grupoComplementoId: 'g-1',
              quantidade: 1,
              nomeComplemento: 'Bacon',
              valorUnitario: 2.5,
              tipoImpactoPreco: 'acrescimo',
            },
          ],
          observacoes: [{ observacao: 'sem cebola' }],
        },
        {
          id: 'pl-2',
          produtoId: 'prod-2',
          nomeProduto: 'Removido',
          quantidade: 1,
          valorUnitario: 1,
          valorFinal: 1,
          removido: true,
          complementos: [],
          observacoes: [],
        },
      ],
      cobrancas: [{ meioPagamentoId: 'mp-1', valor: 42.5 }],
      observacoes: [{ observacao: 'tocar campainha' }],
    })

    expect(parsed.codigoVenda).toBe('WMUTFISQ')
    expect(parsed.produtosLancados).toHaveLength(1)
    expect(parsed.produtosLancados[0].observacoes).toEqual(['sem cebola'])
    expect(parsed.observacoes).toEqual(['tocar campainha'])
    expect(parsed.contextoEntrega?.enderecoEntrega?.rua).toBe('Rua A')
  })
})

describe('mapPedidoPublicoCriadoParaConfirmado', () => {
  it('monta snapshot a partir do response com fallback de imagem e meio', () => {
    const pedido = parseCreatePedidoPublicoResponse({
      codigoVenda: 'ABC123',
      tipoEntrega: 'entrega',
      pedidoAgendado: true,
      valorFinal: 30,
      cliente: { id: 'c1', nome: 'Maria Souza' },
      contextoEntrega: {
        destinatarioTelefone: '12988887777',
        destinatarioNome: 'Maria Souza',
        destinatarioCpf: null,
        enderecoEntrega: {
          etiqueta: 'casa',
          rua: 'Rua B',
          numero: '5',
          bairro: 'Centro',
          cidade: 'Piquete',
          estado: 'SP',
          cep: '12620000',
          complemento: null,
        },
      },
      produtosLancados: [
        {
          id: 'pl-1',
          produtoId: 'prod-1',
          nomeProduto: 'Pizza',
          quantidade: 1,
          valorUnitario: 30,
          valorFinal: 30,
          removido: false,
          complementos: [],
          observacoes: [],
        },
      ],
      cobrancas: [{ meioPagamentoId: 'mp-pix', valor: 30 }],
      observacoes: [],
    })

    const snapshot = mapPedidoPublicoCriadoParaConfirmado(pedido, {
      tipoEntrega: 'retirada',
      modoTempo: 'imediato',
      nome: 'Fallback',
      telefone: '11999999999',
      telefonePaisIso2: 'BR',
      enderecoCliente: null,
      enderecoEmpresaTexto: 'Loja',
      itensCarrinho: [
        {
          id: 'local-1',
          produtoId: 'prod-1',
          produtoNome: 'Pizza local',
          produtoImagemUrl: 'https://cdn/pizza.png',
          quantidade: 1,
          valorUnitario: 30,
          valorTotal: 30,
          observacoes: [],
          complementos: [],
          adicionadoEm: new Date().toISOString(),
        },
      ],
      total: 30,
      pagamentos: [],
      observacaoPedido: '',
      cpfNotaFiscal: '',
      meiosPagamento: [
        {
          id: 'mp-pix',
          nome: 'Pix',
          formaPagamentoFiscal: '17',
          formaPagamentoFiscalLabel: 'Pix',
          isParcelavel: false,
          tipoParcelamento: 'nenhum',
        },
      ],
    })

    expect(snapshot.codigoVenda).toBe('ABC123')
    expect(snapshot.tipoEntrega).toBe('entrega')
    expect(snapshot.modoTempo).toBe('agendado')
    expect(snapshot.nome).toBe('Maria Souza')
    expect(snapshot.itens[0].produtoImagemUrl).toBe('https://cdn/pizza.png')
    expect(snapshot.pagamentos[0].meio?.nome).toBe('Pix')
    expect(snapshot.enderecoCliente?.rua).toBe('Rua B')
  })
})
