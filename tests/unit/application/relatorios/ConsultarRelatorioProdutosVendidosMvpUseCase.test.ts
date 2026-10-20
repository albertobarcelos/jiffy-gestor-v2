import { describe, expect, it, vi } from 'vitest'
import type { ConsultarRelatorioProdutosVendidosMvpInput } from '@/src/application/dto/relatorios/ConsultarRelatorioProdutosVendidosMvpDTO'
import type { IRelatorioProdutosVendidosMvpGateway } from '@/src/application/ports/IRelatorioProdutosVendidosMvpGateway'
import { ConsultarRelatorioProdutosVendidosMvpUseCase } from '@/src/application/use-cases/relatorios/ConsultarRelatorioProdutosVendidosMvpUseCase'

function inputBase(
  flags: Partial<ConsultarRelatorioProdutosVendidosMvpInput> = {}
): ConsultarRelatorioProdutosVendidosMvpInput {
  return {
    empresaId: 'emp-1',
    token: 'tok',
    periodo: 'hoje',
    timezone: 'America/Sao_Paulo',
    sortRaw: 'quantidade_desc',
    incluirSerie: false,
    incluirParticipacao: false,
    somentePagina: false,
    somenteComparativo: false,
    somenteParticipacao: false,
    somenteParticipacaoAbc: false,
    somenteSerie: false,
    somenteComplementos: false,
    impactoComplemento: 'todos',
    grupoIdsParam: '',
    grupoComplementoIdsParam: '',
    valorMin: null,
    valorMax: null,
    qtdMin: null,
    qtdMax: null,
    qBusca: null,
    limit: 50,
    offset: 0,
    searchParams: new URLSearchParams(),
    ...flags,
  }
}

function gatewayMock(): IRelatorioProdutosVendidosMvpGateway {
  return {
    consultarComplementos: vi.fn(async () => ({
      somenteComplementos: true as const,
      items: [],
      kpis: {
        skusDistintos: 0,
        quantidadeTotal: 0,
        valorAumenta: 0,
        valorDiminui: 0,
        valorLiquido: 0,
        complementoLiderNome: null,
        complementoLiderQuantidade: 0,
      },
      totalFiltrado: 0,
    })),
    consultarParticipacao: vi.fn(async () => ({
      somenteParticipacao: true as const,
      participacaoGrupos: [],
    })),
    consultarParticipacaoAbc: vi.fn(async () => ({
      somenteParticipacaoAbc: true as const,
      participacaoAbc: [],
    })),
    consultarSerie: vi.fn(async () => ({
      somenteSerie: true as const,
      serieTemporal: [],
      mockFlags: { serieSimplificada: false, serieGranularidade: 'dia' as const },
    })),
    consultarComparativo: vi.fn(async () => ({
      somenteComparativo: true as const,
      kpis: {
        faturamentoAtual: 0,
        faturamentoAnterior: null,
        variacaoPercentualFat: null,
        quantidadeVendidaAtual: 0,
        quantidadeAnterior: null,
        variacaoPercentualQuantidade: null,
        ticketMedioPorItemNoPeriodo: 0,
        ticketMedioPorItemPeriodoAnterior: null,
        variacaoPercentualTicketMedio: null,
        produtoLiderNomeQuantidade: '',
        produtoLiderQuantidadeUnidades: 0,
        produtoLiderPercentualVsPeriodoAnterior: null,
        produtoComMaiorCrescimentoNome: null,
        produtoComMaiorCrescimentoPct: null,
        produtosDistintosAtual: 0,
        produtosDistintosAnterior: null,
        variacaoPercentualProdutosDistintos: null,
      },
      rankingsPorProduto: [],
      mockFlags: {},
    })),
    consultarPaginaOuPrincipal: vi.fn(async () => ({
      items: [],
      totaisPeriodo: { quantidadeTotal: 0, valorTotal: 0, skusDistintos: 0 },
      totaisFiltrados: { quantidade: 0, valor: 0 },
      totalFiltrado: 0,
      limit: 50,
      offset: 0,
      kpis: {
        faturamentoAtual: 0,
        faturamentoAnterior: null,
        variacaoPercentualFat: null,
        quantidadeVendidaAtual: 0,
        quantidadeAnterior: null,
        variacaoPercentualQuantidade: null,
        ticketMedioPorItemNoPeriodo: 0,
        ticketMedioPorItemPeriodoAnterior: null,
        variacaoPercentualTicketMedio: null,
        produtoLiderNomeQuantidade: '',
        produtoLiderQuantidadeUnidades: 0,
        produtoLiderPercentualVsPeriodoAnterior: null,
        produtoComMaiorCrescimentoNome: null,
        produtoComMaiorCrescimentoPct: null,
        produtosDistintosAtual: 0,
        produtosDistintosAnterior: null,
        variacaoPercentualProdutosDistintos: null,
      },
      participacaoGrupos: [],
      serieTemporal: [],
      rankingsPorProduto: [],
      mockFlags: {},
    })),
  }
}

describe('ConsultarRelatorioProdutosVendidosMvpUseCase', () => {
  it('despacha para complementos', async () => {
    const gateway = gatewayMock()
    const useCase = new ConsultarRelatorioProdutosVendidosMvpUseCase(gateway)
    const result = await useCase.execute(inputBase({ somenteComplementos: true }))
    expect(result).toMatchObject({ somenteComplementos: true })
    expect(gateway.consultarComplementos).toHaveBeenCalledTimes(1)
    expect(gateway.consultarPaginaOuPrincipal).not.toHaveBeenCalled()
  })

  it('despacha para participação, ABC, série e comparativo', async () => {
    const gateway = gatewayMock()
    const useCase = new ConsultarRelatorioProdutosVendidosMvpUseCase(gateway)

    await useCase.execute(inputBase({ somenteParticipacao: true }))
    await useCase.execute(inputBase({ somenteParticipacaoAbc: true }))
    await useCase.execute(inputBase({ somenteSerie: true }))
    await useCase.execute(inputBase({ somenteComparativo: true }))

    expect(gateway.consultarParticipacao).toHaveBeenCalledTimes(1)
    expect(gateway.consultarParticipacaoAbc).toHaveBeenCalledTimes(1)
    expect(gateway.consultarSerie).toHaveBeenCalledTimes(1)
    expect(gateway.consultarComparativo).toHaveBeenCalledTimes(1)
  })

  it('usa a consulta principal quando nenhum bloco isolado é pedido', async () => {
    const gateway = gatewayMock()
    const useCase = new ConsultarRelatorioProdutosVendidosMvpUseCase(gateway)
    await useCase.execute(inputBase({ somentePagina: true }))
    expect(gateway.consultarPaginaOuPrincipal).toHaveBeenCalledTimes(1)
  })
})
