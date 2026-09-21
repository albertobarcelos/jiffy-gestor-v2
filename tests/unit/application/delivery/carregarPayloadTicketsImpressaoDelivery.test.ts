import { beforeEach, describe, expect, it, vi } from 'vitest'
import { carregarPayloadTicketsImpressaoDelivery } from '@/src/application/delivery/carregarPayloadTicketsImpressaoDelivery'
import { fetchInstrucoesImpressaoPedido } from '@/src/infrastructure/api/fetchInstrucoesImpressaoPedido'
import { fetchPedidoDeliveryDetalhe } from '@/src/infrastructure/api/fetchPedidoDeliveryDetalhe'
import { buscarMapeamentosEstacao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { fetchModosImpressaoDaEstacaoPorIds } from '@/src/infrastructure/api/fetchModosImpressaoDaEstacaoPorIds'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'
import { lembrarNomeMeioPagamento } from '@/src/infrastructure/api/meiosPagamentoNomeCache'
import { vendaDetalheReadRepository } from '@/src/infrastructure/api/repositories/VendaDetalheReadRepository'

vi.mock('@/src/infrastructure/api/fetchInstrucoesImpressaoPedido', () => ({
  fetchInstrucoesImpressaoPedido: vi.fn(),
}))
vi.mock('@/src/infrastructure/api/fetchPedidoDeliveryDetalhe', () => ({
  fetchPedidoDeliveryDetalhe: vi.fn(),
}))
vi.mock('@/src/infrastructure/api/estacoesImpressaoApi', () => ({
  buscarMapeamentosEstacao: vi.fn(),
}))
vi.mock('@/src/infrastructure/api/fetchModosImpressaoDaEstacaoPorIds', () => ({
  fetchModosImpressaoDaEstacaoPorIds: vi.fn(),
}))
vi.mock('@/src/infrastructure/printing/estacaoImpressaoStorage', () => ({
  getEstacaoImpressaoId: vi.fn(),
}))
vi.mock('@/src/infrastructure/api/repositories/VendaDetalheReadRepository', () => ({
  vendaDetalheReadRepository: {
    fetchMeioPagamento: vi.fn(),
  },
}))

const fetchInstrucoesMock = vi.mocked(fetchInstrucoesImpressaoPedido)
const fetchPedidoMock = vi.mocked(fetchPedidoDeliveryDetalhe)
const buscarMapeamentosMock = vi.mocked(buscarMapeamentosEstacao)
const fetchModosMock = vi.mocked(fetchModosImpressaoDaEstacaoPorIds)
const getEstacaoMock = vi.mocked(getEstacaoImpressaoId)
const fetchMeioMock = vi.mocked(vendaDetalheReadRepository.fetchMeioPagamento)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => {
    resolve = r
  })
  return { promise, resolve }
}

describe('carregarPayloadTicketsImpressaoDelivery', () => {
  beforeEach(() => {
    fetchInstrucoesMock.mockReset()
    fetchPedidoMock.mockReset()
    buscarMapeamentosMock.mockReset()
    fetchModosMock.mockReset()
    getEstacaoMock.mockReset()
    fetchMeioMock.mockReset()
    getEstacaoMock.mockReturnValue('est-1')
  })

  it('dispara instrucoes, pedido e mapeamentos juntos e nao forca GET do pedido', async () => {
    const instrucoes = deferred<Awaited<ReturnType<typeof fetchInstrucoesImpressaoPedido>>>()
    const pedido = deferred<Awaited<ReturnType<typeof fetchPedidoDeliveryDetalhe>>>()
    const mapeamentos = deferred<Awaited<ReturnType<typeof buscarMapeamentosEstacao>>>()

    let instrucoesStarted = false
    let pedidoStarted = false
    let mapeamentosStarted = false

    fetchInstrucoesMock.mockImplementation(() => {
      instrucoesStarted = true
      return instrucoes.promise
    })
    fetchPedidoMock.mockImplementation(() => {
      pedidoStarted = true
      return pedido.promise
    })
    buscarMapeamentosMock.mockImplementation(() => {
      mapeamentosStarted = true
      return mapeamentos.promise
    })

    const pending = carregarPayloadTicketsImpressaoDelivery({
      vendaId: 'venda-1',
      accessToken: 'tok',
      prefs: DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
    })

    await Promise.resolve()
    expect(instrucoesStarted).toBe(true)
    expect(pedidoStarted).toBe(true)
    expect(mapeamentosStarted).toBe(true)
    expect(fetchPedidoMock).toHaveBeenCalledWith('venda-1', 'tok')

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
    lembrarNomeMeioPagamento('mp-1', 'Dinheiro')
    fetchInstrucoesMock.mockResolvedValue({ ok: true, data: { mapeamentos: [], warnings: [] } })
    fetchPedidoMock.mockResolvedValue({
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
    })
    buscarMapeamentosMock.mockResolvedValue([])

    const result = await carregarPayloadTicketsImpressaoDelivery({
      vendaId: 'venda-1',
      accessToken: 'tok',
      prefs: DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
    })

    expect(result.ok).toBe(true)
    expect(fetchMeioMock).not.toHaveBeenCalled()
  })

  it('modo separado usa o modo da estação e nao busca impressora quando o mapeamento ja traz', async () => {
    fetchInstrucoesMock.mockResolvedValue({
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
    })
    fetchPedidoMock.mockResolvedValue({
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
    })
    buscarMapeamentosMock.mockResolvedValue([
      {
        impressoraId: 'imp-cozinha',
        nomeImpressora: 'Cozinha',
        nomeImpressoraWindows: 'EPSON_COZ',
        modoImpressao: 'agrupado',
      },
    ])

    const result = await carregarPayloadTicketsImpressaoDelivery({
      vendaId: 'venda-1',
      accessToken: 'tok',
      prefs: {
        ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
        modo: 'separado',
        impressoraExpedicaoId: 'imp-exp',
      },
    })

    expect(result.ok).toBe(true)
    expect(fetchModosMock).not.toHaveBeenCalled()
    if (!result.ok) return
    const producao = result.data.tickets.filter(t => t.tipoCupom === 'producao')
    expect(producao).toHaveLength(1)
    expect(producao[0].itens).toHaveLength(1)
    expect(producao[0].itens[0].quantidade).toBe(2)
  })
})
