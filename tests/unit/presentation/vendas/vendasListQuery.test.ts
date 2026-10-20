import { describe, expect, it } from 'vitest'
import { mapItemJsonParaVendaUnificadaDTO } from '@/src/application/dto/VendaUnificadaDTO'
import {
  codigoTerminalCelulaRelatorio,
  nomeLancadorRelatorio,
  tipoVendaIconeRelatorio,
} from '@/src/presentation/utils/vendas/vendasListCalculos'
import {
  METRICAS_VENDAS_VAZIAS,
  acumularMetricasVendasLista,
  agregarMetricasVendasLista,
  aplicarFiltrosClienteRelatorio,
  endpointDetalheVendaRelatorio,
  filtrarVendasPorTipoRelatorio,
  mapFiltroTipoVendaParaUnificado,
  mapVendaUnificadaParaListItem,
} from '@/src/presentation/utils/vendas/vendasListQuery'
import type { VendaListItem, VendasFiltrosQuerySnapshot } from '@/src/presentation/utils/vendas/vendasListTypes'

function item(partial: Partial<VendaListItem> = {}): VendaListItem {
  return {
    id: 'venda-1',
    numeroVenda: 1,
    codigoVenda: 'ABC123',
    valorFinal: 50,
    tipoVenda: 'balcao',
    abertoPorId: 'user-1',
    codigoTerminal: '',
    terminalId: '',
    dataCriacao: '2026-09-01T10:00:00.000Z',
    dataFinalizacao: '2026-09-01T11:00:00.000Z',
    ...partial,
  }
}

function filtros(
  partial: Partial<VendasFiltrosQuerySnapshot> = {}
): VendasFiltrosQuerySnapshot {
  return {
    searchQuery: '',
    valorMinimo: '',
    valorMaximo: '',
    periodo: 'Hoje',
    statusFilter: null,
    tipoVendaFilter: null,
    meioPagamentoFilter: '',
    usuarioAbertoPorFilter: '',
    terminalFilter: '',
    usuarioCancelouFilter: '',
    periodoInicial: null,
    periodoFinal: null,
    ...partial,
  }
}

describe('mapFiltroTipoVendaParaUnificado', () => {
  it('mapeia entrega/retirada para canal DELIVERY + tipoEntrega', () => {
    expect(mapFiltroTipoVendaParaUnificado('entrega')).toEqual({
      tipo: 'DELIVERY',
      tipoEntrega: 'entrega',
    })
    expect(mapFiltroTipoVendaParaUnificado('retirada')).toEqual({
      tipo: 'DELIVERY',
      tipoEntrega: 'retirada',
    })
  })

  it('mapeia gestor para tipo GESTOR e mesa para PDV', () => {
    expect(mapFiltroTipoVendaParaUnificado('gestor')).toEqual({ tipo: 'GESTOR' })
    expect(mapFiltroTipoVendaParaUnificado('mesa')).toEqual({
      tipo: 'PDV',
      tipoVenda: 'mesa',
    })
  })

  it('não força canal PDV em balcão (pode existir nas duas origens)', () => {
    expect(mapFiltroTipoVendaParaUnificado('balcao')).toEqual({ tipoVenda: 'balcao' })
  })
})

describe('filtrarVendasPorTipoRelatorio', () => {
  const lista = [
    item({ id: 'd1', tipoVenda: 'delivery', tipoEntrega: 'entrega', tabelaOrigem: 'venda_gestor' }),
    item({ id: 'd2', tipoVenda: 'delivery', tipoEntrega: 'retirada', tabelaOrigem: 'venda_gestor' }),
    item({ id: 'g1', tipoVenda: 'gestor', tabelaOrigem: 'venda_gestor' }),
    item({ id: 'b1', tipoVenda: 'balcao', tabelaOrigem: 'venda' }),
    item({ id: 'm1', tipoVenda: 'mesa', numeroMesa: 4, tabelaOrigem: 'venda' }),
  ]

  it('separa entrega, retirada e venda do gestor sem delivery', () => {
    expect(filtrarVendasPorTipoRelatorio(lista, 'entrega').map(v => v.id)).toEqual(['d1'])
    expect(filtrarVendasPorTipoRelatorio(lista, 'retirada').map(v => v.id)).toEqual(['d2'])
    expect(filtrarVendasPorTipoRelatorio(lista, 'gestor').map(v => v.id)).toEqual(['g1'])
  })

  it('mantém balcão e mesa pelo tipoVenda', () => {
    expect(filtrarVendasPorTipoRelatorio(lista, 'balcao').map(v => v.id)).toEqual(['b1'])
    expect(filtrarVendasPorTipoRelatorio(lista, 'mesa').map(v => v.id)).toEqual(['m1'])
  })
})

describe('agregarMetricasVendasLista', () => {
  it('fatura só finalizadas e não afirma produtos vendidos', () => {
    const metricas = agregarMetricasVendasLista([
      item({ id: 'ok', valorFinal: 20, dataFinalizacao: '2026-09-01T12:00:00.000Z' }),
      item({
        id: 'canc',
        valorFinal: 80,
        dataCancelamento: '2026-09-01T12:30:00.000Z',
        dataFinalizacao: undefined,
      }),
    ])

    expect(metricas.countVendasEfetivadas).toBe(1)
    expect(metricas.countVendasCanceladas).toBe(1)
    expect(metricas.totalFaturado).toBe(20)
    expect(metricas.totalCancelado).toBe(80)
    expect(metricas.countProdutosVendidos).toBeNull()
  })

  it('não conta o mesmo id duas vezes ao acumular páginas', () => {
    const ids = new Set<string>()
    const primeira = acumularMetricasVendasLista(
      METRICAS_VENDAS_VAZIAS,
      [item({ id: 'ok', valorFinal: 20 })],
      ids
    )
    const segunda = acumularMetricasVendasLista(
      primeira,
      [item({ id: 'ok', valorFinal: 20 }), item({ id: 'ok2', valorFinal: 15 })],
      ids
    )
    expect(segunda.countVendasEfetivadas).toBe(2)
    expect(segunda.totalFaturado).toBe(35)
  })
})

describe('aplicarFiltrosClienteRelatorio', () => {
  it('filtra valor e usuário aberto por', () => {
    const lista = [
      item({ id: 'a', valorFinal: 10, abertoPorId: 'u1' }),
      item({ id: 'b', valorFinal: 90, abertoPorId: 'u2' }),
    ]

    expect(
      aplicarFiltrosClienteRelatorio(lista, filtros({ valorMinimo: '50' })).map(v => v.id)
    ).toEqual(['b'])
    expect(
      aplicarFiltrosClienteRelatorio(lista, filtros({ usuarioAbertoPorFilter: 'u1' })).map(v => v.id)
    ).toEqual(['a'])
  })
})

describe('mapVendaUnificadaParaListItem', () => {
  it('preserva tabelaOrigem, tipoEntrega e usuário para detalhe/NF', () => {
    const venda = mapItemJsonParaVendaUnificadaDTO({
      id: 'gid-1',
      numeroVenda: 12,
      codigoVenda: 'XYZ999',
      tipoVenda: 'delivery',
      origem: 'GESTOR',
      tabelaOrigem: 'venda_gestor',
      valorFinal: 42,
      dataCriacao: '2026-09-01T10:00:00.000Z',
      dataFinalizacao: '2026-09-01T11:00:00.000Z',
      documentoFiscalId: 'doc-fiscal-1',
      abertoPor: { id: 'op-9', nome: 'Ana' },
      tipoEntrega: 'entrega',
    })

    const mapped = mapVendaUnificadaParaListItem(venda)
    expect(mapped.tabelaOrigem).toBe('venda_gestor')
    expect(mapped.tipoEntrega).toBe('entrega')
    expect(mapped.abertoPorNome).toBe('Ana')
    expect(mapped.documentoFiscalId).toBe('doc-fiscal-1')
    expect(tipoVendaIconeRelatorio(mapped)).toBe('entrega')
  })

  it('lê retirada de tipoAtendimento quando tipoEntrega não vem', () => {
    const venda = mapItemJsonParaVendaUnificadaDTO({
      id: 'gid-2',
      tipoVenda: 'delivery',
      origem: 'GESTOR',
      tabelaOrigem: 'venda_gestor',
      valorFinal: 10,
      dataCriacao: '2026-09-01T10:00:00.000Z',
      dataFinalizacao: '2026-09-01T11:00:00.000Z',
      abertoPor: { id: 'op-1', nome: 'João' },
      tipoAtendimento: 'retirada',
    })
    const mapped = mapVendaUnificadaParaListItem(venda)
    expect(mapped.tipoEntrega).toBe('retirada')
    expect(tipoVendaIconeRelatorio(mapped)).toBe('retirada')
  })

  it('não inventa Entrega quando tipoEntrega não veio', () => {
    expect(
      tipoVendaIconeRelatorio(
        item({ tipoVenda: 'delivery', tipoEntrega: null, tabelaOrigem: 'venda_gestor' })
      )
    ).toBe('delivery')
  })

  it('usa o mapa do delivery quando o unificado omite tipoEntrega', () => {
    const venda = mapItemJsonParaVendaUnificadaDTO({
      id: 'gid-3',
      tipoVenda: 'delivery',
      origem: 'GESTOR',
      tabelaOrigem: 'venda_gestor',
      valorFinal: 10,
      dataCriacao: '2026-09-01T10:00:00.000Z',
      dataFinalizacao: '2026-09-01T11:00:00.000Z',
      abertoPor: { id: 'op-1', nome: 'João' },
    })
    const mapped = mapVendaUnificadaParaListItem(venda, new Map([['gid-3', 'retirada']]))
    expect(mapped.tipoEntrega).toBe('retirada')
    expect(tipoVendaIconeRelatorio(mapped)).toBe('retirada')
  })

  it('não inventa Entrega só porque existe contextoEntrega', () => {
    const venda = mapItemJsonParaVendaUnificadaDTO({
      id: 'gid-4',
      codigoVenda: 'ABC123',
      tipoVenda: 'delivery',
      origem: 'GESTOR',
      tabelaOrigem: 'venda_gestor',
      valorFinal: 10,
      dataCriacao: '2026-09-01T10:00:00.000Z',
      dataFinalizacao: '2026-09-01T11:00:00.000Z',
      abertoPor: { id: 'op-1', nome: 'João' },
      contextoEntrega: { destinatarioNome: 'Maria' },
    })
    const mapped = mapVendaUnificadaParaListItem(venda)
    expect(mapped.tipoEntrega).toBeNull()
    expect(tipoVendaIconeRelatorio(mapped)).toBe('delivery')
  })

  it('cruza tipoEntrega pelo codigoVenda quando o id do unificado não bate', () => {
    const venda = mapItemJsonParaVendaUnificadaDTO({
      id: 'unificado-outro-id',
      codigoVenda: 'COD-99',
      tipoVenda: 'delivery',
      origem: 'GESTOR',
      tabelaOrigem: 'venda_gestor',
      valorFinal: 10,
      dataCriacao: '2026-09-01T10:00:00.000Z',
      dataFinalizacao: '2026-09-01T11:00:00.000Z',
      abertoPor: { id: 'op-1', nome: 'João' },
      contextoEntrega: { destinatarioNome: 'Maria' },
    })
    const mapped = mapVendaUnificadaParaListItem(venda, new Map([['COD-99', 'retirada']]))
    expect(mapped.tipoEntrega).toBe('retirada')
    expect(tipoVendaIconeRelatorio(mapped)).toBe('retirada')
  })
})

describe('nomeLancadorRelatorio e terminal', () => {
  const usuarios = new Map([['op-1', 'João']])

  it('mostra quem lançou na loja e oculta canal externo', () => {
    expect(
      nomeLancadorRelatorio(
        item({ origem: 'GESTOR', abertoPorId: 'op-1', abertoPorNome: 'João' }),
        usuarios
      )
    ).toBe('João')
    expect(
      nomeLancadorRelatorio(
        item({ origem: 'IFOOD', abertoPorId: 'cliente-9', abertoPorNome: 'Maria Cliente' }),
        usuarios
      )
    ).toBe('—')
    expect(
      nomeLancadorRelatorio(
        item({ origem: 'JIFFY_DELIVERY', abertoPorId: 'cli-1', abertoPorNome: 'Pedro' }),
        usuarios
      )
    ).toBe('—')
  })

  it('código de terminal só em venda PDV', () => {
    expect(
      codigoTerminalCelulaRelatorio(
        item({ tabelaOrigem: 'venda', origem: 'PDV', codigoTerminal: 'T1' })
      )
    ).toBe('#T1')
    expect(
      codigoTerminalCelulaRelatorio(
        item({ tabelaOrigem: 'venda_gestor', origem: 'GESTOR', codigoTerminal: 'T1' })
      )
    ).toBe('—')
  })
})

describe('endpointDetalheVendaRelatorio', () => {
  it('usa rota do gestor quando a venda não é da tabela PDV', () => {
    expect(endpointDetalheVendaRelatorio('abc', 'venda_gestor')).toBe('/api/vendas/gestor/abc')
    expect(endpointDetalheVendaRelatorio('abc', 'venda')).toBe('/api/vendas/abc')
  })
})
