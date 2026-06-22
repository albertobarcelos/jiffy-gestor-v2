import { describe, expect, it } from 'vitest'
import { montarTicketsResponseFromInstrucoes } from '@/src/application/delivery/montarTicketsResponseFromInstrucoes'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'

const pedidoBase = {
  id: 'venda-1',
  numeroVenda: 42,
  codigoVenda: 'ABC123',
  tipoEntrega: 'entrega',
  valorFinal: 50,
  totalPago: 50,
  totalFaltaPagar: 0,
  troco: 0,
  dataCriacao: '2026-06-15T10:00:00.000Z',
  previsaoEntregaEm: '2026-06-15T11:00:00.000Z',
  cliente: { id: 'cli-1', nome: 'Maria' },
  contextoEntrega: {
    destinatarioTelefone: '65999998888',
    enderecoEntrega: {
      rua: 'Rua A',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Campo Grande',
      estado: 'MS',
      cep: '79002000',
    },
  },
  produtosLancados: [
    {
      id: 'pl-1',
      produtoId: 'p-1',
      nomeProduto: 'Hambúrguer',
      quantidade: 2,
      valorUnitario: 20,
      valorFinal: 40,
      removido: false,
      complementos: [],
      observacoes: [],
    },
    {
      id: 'pl-2',
      produtoId: 'p-2',
      nomeProduto: 'Refrigerante',
      quantidade: 1,
      valorUnitario: 10,
      valorFinal: 10,
      removido: false,
      complementos: [],
      observacoes: [],
    },
  ],
  cobrancas: [],
  taxasLancadas: [],
  observacoes: [],
}

describe('montarTicketsResponseFromInstrucoes', () => {
  it('modo unificado gera ticket unificado com todos os itens', () => {
    const prefs = {
      ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
      modo: 'unificado' as const,
      copiasCupomUnificado: 2,
      impressoraExpedicaoId: 'imp-exp',
    }

    const result = montarTicketsResponseFromInstrucoes({
      instrucoes: {
        mapeamentos: [
          {
            impressoraId: 'imp-exp',
            impressoraNome: 'Expedição',
            nomeImpressoraWindows: 'EPSON_EXP',
            produtosLancadosIds: ['pl-1', 'pl-2'],
          },
        ],
        warnings: [],
      },
      pedido: pedidoBase,
      prefs,
      empresa: { id: 'emp-1', nomeExibicao: 'Loja Teste' },
      estacaoImpressaoId: 'est-1',
    })

    expect(result.tickets.length).toBe(1)
    expect(result.tickets[0].tipoCupom).toBe('unificado')
    expect(result.tickets[0].copias).toBe(2)
    expect(result.tickets[0].itens?.length).toBe(2)
    expect(result.modoImpressaoDelivery).toBe('unificado')
    expect(result.cliente?.nome).toBe('Maria')
    expect(result.cliente?.telefone).toBe('65999998888')
  })

  it('modo separado gera tickets de produção e expedição com todos os itens', () => {
    const prefs = {
      ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
      modo: 'separado' as const,
      impressoraExpedicaoId: 'imp-exp',
    }

    const result = montarTicketsResponseFromInstrucoes({
      instrucoes: {
        mapeamentos: [
          {
            impressoraId: 'imp-cozinha',
            impressoraNome: 'Cozinha',
            nomeImpressoraWindows: 'EPSON_COZ',
            produtosLancadosIds: ['pl-1'],
          },
          {
            impressoraId: 'imp-exp',
            impressoraNome: 'Expedição',
            nomeImpressoraWindows: 'EPSON_EXP',
            produtosLancadosIds: ['pl-2'],
          },
        ],
        warnings: [
          {
            code: 'PRODUTO_SEM_IMPRESSORA_FALLBACK_EXPEDICAO',
            message: 'fallback',
            contexto: { produtoLancadoId: 'pl-2' },
          },
        ],
      },
      pedido: pedidoBase,
      prefs,
    })

    const producao = result.tickets.filter(t => t.tipoCupom === 'producao')
    const expedicao = result.tickets.find(t => t.tipoCupom === 'expedicao')

    expect(producao.length).toBe(2)
    expect(producao.find(t => t.impressoraId === 'imp-cozinha')?.itens?.length).toBe(1)
    const ticketFallback = producao.find(t => t.impressoraId === 'imp-exp')
    expect(ticketFallback?.impressora?.origem).toBe('fallback_expedicao')

    expect(expedicao).toBeDefined()
    expect(expedicao?.itens?.length).toBe(2)
  })

  it('marca_pronto pode filtrar ticket expedicao', () => {
    const prefs = {
      ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
      modo: 'separado' as const,
      impressoraExpedicaoId: 'imp-exp',
    }

    const result = montarTicketsResponseFromInstrucoes({
      instrucoes: {
        mapeamentos: [
          {
            impressoraId: 'imp-cozinha',
            impressoraNome: 'Cozinha',
            nomeImpressoraWindows: 'EPSON_COZ',
            produtosLancadosIds: ['pl-1', 'pl-2'],
          },
        ],
        warnings: [],
      },
      pedido: pedidoBase,
      prefs,
      mapeamentosEstacao: [
        {
          impressoraId: 'imp-exp',
          nomeImpressora: 'Expedição',
          nomeImpressoraWindows: 'EPSON_EXP',
        },
      ],
    })

    const expedicao = result.tickets.find(t => t.tipoCupom === 'expedicao')
    expect(expedicao?.itens?.map(i => i.produtoLancadoId)).toEqual(['pl-1', 'pl-2'])
    expect(expedicao?.nomeImpressoraWindows).toBe('EPSON_EXP')
  })

  it('inclui meio de pagamento da cobrança na entrega no payload', () => {
    const prefs = {
      ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
      modo: 'separado' as const,
      impressoraExpedicaoId: 'imp-exp',
    }

    const result = montarTicketsResponseFromInstrucoes({
      instrucoes: { mapeamentos: [], warnings: [] },
      pedido: {
        ...pedidoBase,
        totalFaltaPagar: 29,
        totalPago: 0,
        cobrancas: [
          {
            id: 'cob-1',
            meioPagamentoId: 'mp-dinheiro',
            valor: 29,
            momentoCobranca: 'na_entrega',
            status: 'pendente',
          },
        ],
      },
      prefs,
      nomesMeiosPagamentoPorId: { 'mp-dinheiro': 'Dinheiro' },
    })

    expect(result.pagamento?.meioPagamento).toBe('Dinheiro')
    expect(result.pagamento?.valorCobrarNaEntrega).toBe(29)
  })
})
