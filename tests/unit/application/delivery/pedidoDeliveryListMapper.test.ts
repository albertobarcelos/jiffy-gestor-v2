import { describe, expect, it } from 'vitest'
import type { PedidoDeliverySummaryApi } from '@/src/application/dto/api/pedidoDeliveryListApi'
import { derivarFluxoPagamentoEntregaDeliverySummary } from '@/src/application/mappers/DeliveryFluxoPagamentoMapper'
import {
  derivarStatusFinanceiroDeliverySummary,
  mapOrigemApiDeliveryParaVendaUnificada,
  mapPedidoDeliverySummaryParaVendaUnificadaDTO,
  mapPedidosDeliveryListResponseParaVendaUnificadaDTO,
  normalizarPedidosDeliveryListResponse,
  pedidoDeliverySummaryParaUnifiedRecord,
} from '@/src/application/mappers/PedidoDeliveryListMapper'

function criarSummary(
  overrides: Partial<PedidoDeliverySummaryApi> = {}
): PedidoDeliverySummaryApi {
  return {
    id: 'ped-1',
    numeroVenda: 42,
    codigoVenda: 'V0042',
    tipoVenda: 'delivery',
    tipoEntrega: 'entrega',
    tempoTotalEstimadoSegundos: 1800,
    previsaoEntregaEm: null,
    origem: 'GESTOR',
    statusDelivery: 'PENDENTE',
    valorFinal: 80,
    troco: 0,
    totalPago: 80,
    totalFaltaPagar: 0,
    totalCobrancasCriadas: 1,
    totalCobrancasNaoEfetivadas: 0,
    dataCriacao: '2026-06-15T10:00:00.000Z',
    dataInicioPreparo: null,
    dataFinalizacaoPreparo: null,
    dataSaidaEntrega: null,
    dataFinalizacao: null,
    dataUltimaModificacao: '2026-06-15T10:05:00.000Z',
    dataUltimoProdutoLancado: '2026-06-15T10:00:00.000Z',
    dataCancelamento: null,
    cliente: { id: 'cli-1', nome: 'Maria' },
    solicitarEmissaoFiscal: false,
    cobrancas: [],
    resumoFiscal: null,
    observacoes: [],
    ...overrides,
  }
}

describe('PedidoDeliveryListMapper — origem e financeiro', () => {
  it('mapeia JIFFY_DELIVERY para origem GESTOR no DTO unificado', () => {
    expect(mapOrigemApiDeliveryParaVendaUnificada('JIFFY_DELIVERY')).toBe('GESTOR')
    expect(mapOrigemApiDeliveryParaVendaUnificada('GESTOR')).toBe('GESTOR')
  })

  it('deriva status financeiro pago, pendente e parcial', () => {
    expect(derivarStatusFinanceiroDeliverySummary(0, 80)).toBe('pago')
    expect(derivarStatusFinanceiroDeliverySummary(30, 0)).toBe('pendente')
    expect(derivarStatusFinanceiroDeliverySummary(30, 50)).toBe('parcial')
    expect(
      derivarStatusFinanceiroDeliverySummary(30, 0, [
        {
          id: 'c1',
          valor: 50,
          meioPagamentoId: 'mp1',
          momentoCobranca: 'antecipado',
          status: 'paga',
          dataCriacao: '2026-06-15T10:00:00.000Z',
        },
        {
          id: 'c2',
          valor: 30,
          meioPagamentoId: 'mp2',
          momentoCobranca: 'na_entrega',
          status: 'pendente',
          dataCriacao: '2026-06-15T10:00:00.000Z',
        },
      ])
    ).toBe('parcial')
  })

  it('deriva fluxo de pagamento antecipado vs cobrar na entrega', () => {
    expect(derivarFluxoPagamentoEntregaDeliverySummary(0, [])).toBe('ja_pago')
    expect(
      derivarFluxoPagamentoEntregaDeliverySummary(0, [
        {
          id: 'c1',
          valor: 80,
          meioPagamentoId: 'mp1',
          momentoCobranca: 'antecipado',
          status: 'paga',
          dataCriacao: '2026-06-15T10:00:00.000Z',
        },
      ])
    ).toBe('ja_pago')
    expect(
      derivarFluxoPagamentoEntregaDeliverySummary(30, [
        {
          id: 'c2',
          valor: 30,
          meioPagamentoId: 'mp2',
          momentoCobranca: 'na_entrega',
          status: 'pendente',
          dataCriacao: '2026-06-15T10:00:00.000Z',
        },
      ])
    ).toBe('cobrar_entregador')
  })
})

describe('PedidoDeliveryListMapper — summary → VendaUnificadaDTO', () => {
  it('usa tipoEntrega como tipoVenda (não o campo delivery da API)', () => {
    const record = pedidoDeliverySummaryParaUnifiedRecord(
      criarSummary({ tipoVenda: 'delivery', tipoEntrega: 'retirada' })
    )
    expect(record.tipoVenda).toBe('retirada')

    const dto = mapPedidoDeliverySummaryParaVendaUnificadaDTO(
      criarSummary({ tipoEntrega: 'entrega' })
    )
    expect(dto.tipoVenda).toBe('entrega')
    expect(dto.tabelaOrigem).toBe('venda_gestor')
  })

  it('propaga previsão, tempo estimado e forma de cobrança', () => {
    const dto = mapPedidoDeliverySummaryParaVendaUnificadaDTO(
      criarSummary({
        previsaoEntregaEm: '2026-06-15T10:45:00.000Z',
        tempoTotalEstimadoSegundos: 2700,
        totalFaltaPagar: 25,
        cobrancas: [
          {
            id: 'c1',
            valor: 25,
            meioPagamentoId: 'mp1',
            momentoCobranca: 'na_entrega',
            status: 'pendente',
            dataCriacao: '2026-06-15T10:00:00.000Z',
          },
        ],
      })
    )

    expect(dto.previsaoEntregaEm).toBe('2026-06-15T10:45:00.000Z')
    expect(dto.tempoTotalEstimadoSegundos).toBe(2700)
    expect(dto.fluxoPagamentoEntrega).toBe('cobrar_entregador')
    expect(dto.cobrancasDelivery).toEqual([
      { meioPagamentoId: 'mp1', status: 'pendente', momentoCobranca: 'na_entrega' },
    ])
  })

  it('propaga entregador e contextoEntrega do summary', () => {
    const dto = mapPedidoDeliverySummaryParaVendaUnificadaDTO(
      criarSummary({
        entregador: { id: 'ent-1', nome: 'João', telefone: '11999999999' },
        contextoEntrega: {
          destinatarioNome: 'Maria',
          destinatarioTelefone: '11988887777',
          enderecoEntrega: {
            etiqueta: 'casa',
            rua: 'Rua A',
            numero: '10',
            bairro: 'Centro',
            cep: '01310100',
          },
        },
      })
    )

    expect(dto.entregador).toEqual({
      id: 'ent-1',
      nome: 'João',
      telefone: '11999999999',
    })
    expect(dto.contextoEntrega?.destinatarioTelefone).toBe('11988887777')
    expect(dto.contextoEntrega?.enderecoEntrega?.rua).toBe('Rua A')
  })

  it('propaga statusDelivery e reconhece pedido entrega no Kanban', () => {
    const dto = mapPedidoDeliverySummaryParaVendaUnificadaDTO(
      criarSummary({ statusDelivery: 'EM_PREPARO' })
    )

    expect(dto.statusEtapaOperacional).toBe('EM_PREPARO')
    expect(dto.isPedidoEntregaGestor()).toBe(true)
    expect(dto.getEtapaKanban()).toBe('EM_PREPARO')
  })

  it('mapeia resumo fiscal e status upper case', () => {
    const dto = mapPedidoDeliverySummaryParaVendaUnificadaDTO(
      criarSummary({
        statusDelivery: 'FINALIZADO',
        dataFinalizacao: '2026-06-15T11:00:00.000Z',
        solicitarEmissaoFiscal: true,
        resumoFiscal: {
          id: 'fiscal-1',
          status: 'rejeitada',
          numero: null,
          retornoSefaz: 'Rejeição teste',
          codigoRetorno: '999',
          serie: '1',
          dataEmissao: null,
          modelo: 65,
          documentoFiscalId: null,
          chaveFiscal: null,
          empresaId: 'emp-1',
          vendaId: 'ped-1',
          terminalId: null,
          dataCriacao: '2026-06-15T11:00:00.000Z',
          dataUltimaModificacao: '2026-06-15T11:00:00.000Z',
        },
      })
    )

    expect(dto.statusFiscal).toBe('REJEITADA')
    expect(dto.retornoSefaz).toBe('Rejeição teste')
    expect(dto.modelo).toBe(65)
    expect(dto.tipoDocFiscal).toBe('NFCE')
    expect(dto.getEtapaKanban()).toBe('PENDENTE_EMISSAO')
  })

  it('nota emitida vai para coluna COM_FISCAL', () => {
    const dto = mapPedidoDeliverySummaryParaVendaUnificadaDTO(
      criarSummary({
        statusDelivery: 'FINALIZADO',
        dataFinalizacao: '2026-06-15T11:00:00.000Z',
        resumoFiscal: {
          id: 'fiscal-2',
          status: 'EMITIDA',
          numero: 123,
          retornoSefaz: null,
          codigoRetorno: null,
          serie: '1',
          dataEmissao: '2026-06-15T11:05:00.000Z',
          modelo: 55,
          documentoFiscalId: 'doc-1',
          chaveFiscal: '3526...',
          empresaId: 'emp-1',
          vendaId: 'ped-1',
          terminalId: null,
          dataCriacao: '2026-06-15T11:00:00.000Z',
          dataUltimaModificacao: '2026-06-15T11:05:00.000Z',
        },
      })
    )

    expect(dto.temNFeEmitida()).toBe(true)
    expect(dto.getEtapaKanban()).toBe('COM_FISCAL')
    expect(dto.documentoFiscalId).toBe('doc-1')
    expect(dto.numeroFiscal).toBe(123)
  })

  it('propaga observações do pedido para o DTO do Kanban', () => {
    const dto = mapPedidoDeliverySummaryParaVendaUnificadaDTO(
      criarSummary({
        observacoes: [
          {
            observacao: 'Sem cebola',
            dataLancamento: '2026-06-15T10:01:00.000Z',
          },
        ],
      })
    )

    expect(dto.observacoes).toEqual(['Sem cebola'])
  })

  it('PENDENTE operacional cai em NOVOS_PEDIDOS', () => {
    const dto = mapPedidoDeliverySummaryParaVendaUnificadaDTO(criarSummary())
    expect(dto.getEtapaKanban()).toBe('NOVOS_PEDIDOS')
  })
})

describe('PedidoDeliveryListMapper — resposta paginada', () => {
  it('normaliza e mapeia lista completa', () => {
    const raw = {
      count: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      items: [
        {
          id: 'ped-99',
          numeroVenda: 99,
          codigoVenda: 'V0099',
          tipoVenda: 'delivery',
          tipoEntrega: 'entrega',
          origem: 'JIFFY_DELIVERY',
          statusDelivery: 'PRONTO',
          valorFinal: 50,
          totalFaltaPagar: 50,
          totalPago: 0,
          dataCriacao: '2026-06-15T12:00:00.000Z',
          dataUltimaModificacao: '2026-06-15T12:10:00.000Z',
          dataUltimoProdutoLancado: '2026-06-15T12:00:00.000Z',
          solicitarEmissaoFiscal: false,
          cobrancas: [],
          resumoFiscal: null,
        },
      ],
    }

    const normalizado = normalizarPedidosDeliveryListResponse(raw)
    expect(normalizado.items).toHaveLength(1)
    expect(normalizado.items[0]?.origem).toBe('JIFFY_DELIVERY')

    const mapeado = mapPedidosDeliveryListResponseParaVendaUnificadaDTO(normalizado)
    expect(mapeado.items[0]?.tipoVenda).toBe('entrega')
    expect(mapeado.items[0]?.getEtapaKanban()).toBe('PRONTO_ENTREGA')
    expect(mapeado.items[0]?.statusFinanceiro).toBe('pendente')
  })
})
