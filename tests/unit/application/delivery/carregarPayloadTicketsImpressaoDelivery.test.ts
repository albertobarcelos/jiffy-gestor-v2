import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  criarCarregarPayloadTicketsImpressaoDelivery,
  type CarregarPayloadTicketsImpressaoDeps,
} from '@/src/application/delivery/carregarPayloadTicketsImpressaoDelivery'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => {
    resolve = r
  })
  return { promise, resolve }
}

function depsFake(overrides: Partial<CarregarPayloadTicketsImpressaoDeps> = {}): CarregarPayloadTicketsImpressaoDeps {
  return {
    obterEstacaoId: vi.fn().mockReturnValue('est-1'),
    buscarInstrucoes: vi.fn(),
    buscarPedido: vi.fn(),
    buscarMapeamentos: vi.fn(),
    buscarModosPorIds: vi.fn(),
    snapshotNomesMeios: vi.fn().mockReturnValue({}),
    lembrarNomeMeio: vi.fn(),
    obterNomeMeio: vi.fn(),
    fetchMeioPagamento: vi.fn(),
    ...overrides,
  }
}

describe('criarCarregarPayloadTicketsImpressaoDelivery', () => {
  let nomes: Record<string, string>

  beforeEach(() => {
    nomes = {}
  })

  it('dispara instrucoes, pedido e mapeamentos juntos e nao forca GET do pedido', async () => {
    const instrucoes = deferred<Awaited<ReturnType<CarregarPayloadTicketsImpressaoDeps['buscarInstrucoes']>>>()
    const pedido = deferred<Awaited<ReturnType<CarregarPayloadTicketsImpressaoDeps['buscarPedido']>>>()
    const mapeamentos = deferred<Awaited<ReturnType<CarregarPayloadTicketsImpressaoDeps['buscarMapeamentos']>>>()

    let instrucoesStarted = false
    let pedidoStarted = false
    let mapeamentosStarted = false

    const deps = depsFake({
      buscarInstrucoes: vi.fn().mockImplementation(() => {
        instrucoesStarted = true
        return instrucoes.promise
      }),
      buscarPedido: vi.fn().mockImplementation(() => {
        pedidoStarted = true
        return pedido.promise
      }),
      buscarMapeamentos: vi.fn().mockImplementation(() => {
        mapeamentosStarted = true
        return mapeamentos.promise
      }),
    })
    const carregar = criarCarregarPayloadTicketsImpressaoDelivery(deps)

    const pending = carregar({
      vendaId: 'venda-1',
      accessToken: 'tok',
      prefs: DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
    })

    await Promise.resolve()
    expect(instrucoesStarted).toBe(true)
    expect(pedidoStarted).toBe(true)
    expect(mapeamentosStarted).toBe(true)
    expect(deps.buscarPedido).toHaveBeenCalledWith('venda-1', 'tok')

    instrucoes.resolve({ ok: true, data: { mapeamentos: [], warnings: [] } })
    pedido.resolve({
      ok: true,
      data: {
        id: 'venda-1',
        numeroVenda: 1,
        valorFinal: 40,
        produtosLancados: [],
        cobrancas: [],
        taxasLancadas: [],
      },
    })
    mapeamentos.resolve([])

    const result = await pending
    expect(result.ok).toBe(true)
  })

  it('nao busca meio de pagamento na API quando o nome ja esta em cache', async () => {
    nomes['mp-1'] = 'Dinheiro'
    const deps = depsFake({
      snapshotNomesMeios: () => ({ ...nomes }),
      obterNomeMeio: id => nomes[id],
      lembrarNomeMeio: (id, nome) => {
        nomes[id] = nome
      },
      buscarInstrucoes: vi.fn().mockResolvedValue({ ok: true, data: { mapeamentos: [], warnings: [] } }),
      buscarPedido: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'venda-1',
          numeroVenda: 1,
          valorFinal: 40,
          produtosLancados: [],
          cobrancas: [
            {
              id: 'c1',
              meioPagamentoId: 'mp-1',
              valor: 40,
              momentoCobranca: 'na_entrega',
              status: 'pendente',
            },
          ],
          taxasLancadas: [],
        },
      }),
      buscarMapeamentos: vi.fn().mockResolvedValue([]),
    })
    const carregar = criarCarregarPayloadTicketsImpressaoDelivery(deps)

    const result = await carregar({
      vendaId: 'venda-1',
      accessToken: 'tok',
      prefs: DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
    })

    expect(result.ok).toBe(true)
    expect(deps.fetchMeioPagamento).not.toHaveBeenCalled()
  })

  it('modo separado usa o modo da estação e nao busca impressora quando o mapeamento ja traz', async () => {
    const deps = depsFake({
      buscarInstrucoes: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          mapeamentos: [
            {
              impressoraId: 'imp-cozinha',
              impressoraNome: 'Cozinha',
              nomeImpressoraWindows: 'EPSON_COZ',
              produtosLancadosIds: ['pl-1'],
            },
          ],
          warnings: [],
        },
      }),
      buscarPedido: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'venda-1',
          numeroVenda: 1,
          valorFinal: 40,
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
          ],
          cobrancas: [],
          taxasLancadas: [],
        },
      }),
      buscarMapeamentos: vi.fn().mockResolvedValue([
        {
          impressoraId: 'imp-cozinha',
          nomeImpressora: 'Cozinha',
          nomeImpressoraWindows: 'EPSON_COZ',
          modoImpressao: 'agrupado',
        },
      ]),
    })
    const carregar = criarCarregarPayloadTicketsImpressaoDelivery(deps)

    const result = await carregar({
      vendaId: 'venda-1',
      accessToken: 'tok',
      prefs: {
        ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
        modo: 'separado',
        impressoraExpedicaoId: 'imp-exp',
      },
    })

    expect(result.ok).toBe(true)
    expect(deps.buscarModosPorIds).not.toHaveBeenCalled()
    if (!result.ok) return
    const producao = result.data.tickets.filter(t => t.tipoCupom === 'producao')
    expect(producao).toHaveLength(1)
    expect(producao[0].itens).toHaveLength(1)
    expect(producao[0].itens[0].quantidade).toBe(2)
  })
})
