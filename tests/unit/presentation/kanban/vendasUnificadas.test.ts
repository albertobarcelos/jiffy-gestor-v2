import { describe, expect, it } from 'vitest'
import { VendaUnificadaDTO } from '@/src/presentation/components/features/kanban/hooks/useVendasUnificadas'

/**
 * Factory mínima para testes de `getEtapaKanban`.
 * Usa argumentos posicionais alinhados ao construtor de VendaUnificadaDTO.
 */
function makeVenda(overrides: {
  statusFiscal?: VendaUnificadaDTO['statusFiscal']
  etapaKanbanBalcao?: VendaUnificadaDTO['etapaKanbanBalcao']
  solicitarEmissaoFiscal?: boolean
  tipoVenda?: string | null
  tipoEntrega?: 'entrega' | 'retirada' | null
  tabelaOrigem?: 'venda' | 'venda_gestor'
  statusEtapaOperacional?: string | null
  dataFinalizacao?: string | null
} = {}): VendaUnificadaDTO {
  return new VendaUnificadaDTO(
    /* 01 id                     */ 'venda-test-1',
    /* 02 numeroVenda             */ 1,
    /* 03 codigoVenda             */ '#ABCDEFGH',
    /* 04 tipoVenda               */ overrides.tipoVenda ?? null,
    /* 05 origem                  */ 'PDV',
    /* 06 tabelaOrigem            */ overrides.tabelaOrigem ?? 'venda',
    /* 07 valorFinal              */ 100,
    /* 08 totalDesconto           */ 0,
    /* 09 totalAcrescimo          */ 0,
    /* 10 dataCriacao             */ '2026-07-01T10:00:00.000Z',
    /* 11 dataFinalizacao         */ Object.prototype.hasOwnProperty.call(overrides, 'dataFinalizacao')
      ? (overrides.dataFinalizacao ?? null)
      : '2026-07-01T11:00:00.000Z',
    /* 12 dataCancelamento        */ null,
    /* 13 cliente                 */ null,
    /* 14 solicitarEmissaoFiscal  */ overrides.solicitarEmissaoFiscal ?? false,
    /* 15 statusFiscal            */ overrides.statusFiscal ?? null,
    /* 16 documentoFiscalId       */ null,
    /* 17 abertoPor               */ { id: 'user-1', nome: 'Operador' },
    /* 18 numeroMesa              */ undefined,
    /* 19 numeroFiscal            */ undefined,
    /* 20 serieFiscal             */ undefined,
    /* 21 dataEmissaoFiscal       */ undefined,
    /* 22 tipoDocFiscal           */ undefined,
    /* 23 modelo                  */ undefined,
    /* 24 retornoSefaz            */ undefined,
    /* 25 statusEtapaOperacional  */ overrides.statusEtapaOperacional ?? null,
    /* 26 dataUltimaModificacao   */ undefined,
    /* 27 statusFinanceiro        */ undefined,
    /* 28 observacoes             */ undefined,
    /* 29 previsaoEntregaEm       */ undefined,
    /* 30 tempoTotalEstimadoSeg.. */ undefined,
    /* 31 fluxoPagamentoEntrega   */ undefined,
    /* 32 cobrancasDelivery       */ undefined,
    /* 33 entregador              */ undefined,
    /* 34 contextoEntrega         */ undefined,
    /* 35 etapaKanbanBalcao       */ overrides.etapaKanbanBalcao ?? null,
    /* 36 tipoEntrega             */ overrides.tipoEntrega ?? null
  )
}

describe('VendaUnificadaDTO.getEtapaKanban — backend source of truth', () => {
  it('retorna etapaKanbanBalcao do backend quando presente (COM_FISCAL)', () => {
    const venda = makeVenda({ etapaKanbanBalcao: 'COM_FISCAL' })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })

  it('retorna FINALIZADAS quando backend envia essa etapa', () => {
    const venda = makeVenda({ etapaKanbanBalcao: 'FINALIZADAS' })
    expect(venda.getEtapaKanban()).toBe('FINALIZADAS')
  })

  it('retorna REJEITADAS quando backend envia essa etapa', () => {
    const venda = makeVenda({ etapaKanbanBalcao: 'REJEITADAS', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('REJEITADAS')
  })

  it('retorna PENDENTE_EMISSAO quando backend envia essa etapa', () => {
    const venda = makeVenda({ etapaKanbanBalcao: 'PENDENTE_EMISSAO', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('PENDENTE_EMISSAO')
  })

  it('etapaKanbanBalcao tem prioridade sobre statusFiscal', () => {
    const venda = makeVenda({ etapaKanbanBalcao: 'COM_FISCAL', statusFiscal: 'REJEITADA' })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })
})

describe('VendaUnificadaDTO.getEtapaKanban — balcão fiscal (POS + Gestor, etapaKanbanBalcao null)', () => {
  it('REJEITADA → REJEITADAS', () => {
    const venda = makeVenda({ statusFiscal: 'REJEITADA', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('REJEITADAS')
  })

  it('DENEGADA → REJEITADAS', () => {
    const venda = makeVenda({ statusFiscal: 'DENEGADA', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('REJEITADAS')
  })

  it('EMITINDO → COM_FISCAL', () => {
    const venda = makeVenda({ statusFiscal: 'EMITINDO', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })

  it('EMITIDA → COM_FISCAL', () => {
    const venda = makeVenda({ statusFiscal: 'EMITIDA', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })

  it('PENDENTE → COM_FISCAL', () => {
    const venda = makeVenda({ statusFiscal: 'PENDENTE', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })

  it('CANCELADA → COM_FISCAL', () => {
    const venda = makeVenda({ statusFiscal: 'CANCELADA', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })

  it('sem statusFiscal + solicitarEmissaoFiscal=true → PENDENTE_EMISSAO', () => {
    const venda = makeVenda({
      statusFiscal: null,
      solicitarEmissaoFiscal: true,
      dataFinalizacao: null,
    })
    expect(venda.getEtapaKanban()).toBe('PENDENTE_EMISSAO')
  })

  it('sem statusFiscal + dataFinalizacao → FINALIZADAS', () => {
    const venda = makeVenda({
      statusFiscal: null,
      solicitarEmissaoFiscal: false,
      dataFinalizacao: '2026-07-01T11:00:00.000Z',
    })
    expect(venda.getEtapaKanban()).toBe('FINALIZADAS')
  })

  it('venda aberta sem fiscal e sem etapaKanbanBalcao fica fora do quadro', () => {
    const venda = makeVenda({
      statusFiscal: null,
      solicitarEmissaoFiscal: false,
      dataFinalizacao: null,
      statusEtapaOperacional: 'FINALIZADO',
    })
    expect(venda.getEtapaKanban()).toBe('')
  })

  it('UNKNOWN fiscal vai para COM_FISCAL', () => {
    const venda = makeVenda({ statusFiscal: 'UNKNOWN', dataFinalizacao: null })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })
})

describe('VendaUnificadaDTO.getEtapaKanban — delivery operacional (prioridade logística)', () => {
  it('pedido entrega em EM_PREPARO → EM_PREPARO (ignora fiscal)', () => {
    const venda = makeVenda({
      tipoVenda: 'delivery',
      tabelaOrigem: 'venda_gestor',
      statusEtapaOperacional: 'EM_PREPARO',
      statusFiscal: 'EMITIDA',
      etapaKanbanBalcao: null,
    })
    expect(venda.getEtapaKanban()).toBe('EM_PREPARO')
  })

  it('pedido retirada em PRONTO → PRONTO_ENTREGA', () => {
    const venda = makeVenda({
      tipoVenda: 'delivery',
      tipoEntrega: 'retirada',
      tabelaOrigem: 'venda_gestor',
      statusEtapaOperacional: 'PRONTO',
      etapaKanbanBalcao: null,
    })
    expect(venda.getEtapaKanban()).toBe('PRONTO_ENTREGA')
  })

  it('pedido entrega FINALIZADO cai para regras fiscais (etapaKanbanBalcao)', () => {
    const venda = makeVenda({
      tipoVenda: 'delivery',
      tabelaOrigem: 'venda_gestor',
      statusEtapaOperacional: 'FINALIZADO',
      etapaKanbanBalcao: 'FINALIZADAS',
    })
    expect(venda.getEtapaKanban()).toBe('FINALIZADAS')
  })

  it('pedido entregue com nota emitida e sem statusDelivery permanece no fiscal', () => {
    const venda = makeVenda({
      tipoVenda: 'delivery',
      tabelaOrigem: 'venda_gestor',
      statusEtapaOperacional: null,
      statusFiscal: 'EMITIDA',
      dataFinalizacao: '2026-07-01T11:00:00.000Z',
      etapaKanbanBalcao: null,
    })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })

  it('delivery sem etapa operacional não inventa NOVOS_PEDIDOS', () => {
    const venda = makeVenda({
      tipoVenda: 'delivery',
      tabelaOrigem: 'venda_gestor',
      statusEtapaOperacional: null,
      statusFiscal: null,
      dataFinalizacao: null,
      etapaKanbanBalcao: null,
    })
    expect(venda.getEtapaKanban()).toBe('')
  })
})

describe('VendaUnificadaDTO.getEtapaKanban — não mistura POS/balcão com delivery', () => {
  it('venda POS usa coluna fiscal mesmo com statusDelivery operacional', () => {
    const venda = makeVenda({
      tipoVenda: 'balcao',
      tabelaOrigem: 'venda',
      statusEtapaOperacional: 'EM_PREPARO',
      statusFiscal: 'EMITIDA',
      etapaKanbanBalcao: null,
    })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })

  it('venda gestor balcão usa coluna fiscal, não logística', () => {
    const venda = makeVenda({
      tipoVenda: 'balcao',
      tabelaOrigem: 'venda_gestor',
      statusEtapaOperacional: 'EM_PREPARO',
      statusFiscal: 'EMITIDA',
      etapaKanbanBalcao: null,
    })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })
})
