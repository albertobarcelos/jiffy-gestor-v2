import { describe, expect, it } from 'vitest'
import {
  vendaElegivelParaReemissaoAutomaticaLote,
  fiscalKanbanPodeReemitirAposCooldown,
} from '@/src/presentation/components/features/kanban/rules/vendasKanban.rules'
import type { VendaUnificadaDTO } from '@/src/presentation/components/features/kanban/hooks/useVendasUnificadas'

/** Venda mínima para testar regras do kanban */
function makeVenda(
  overrides: Partial<
    Pick<
      VendaUnificadaDTO,
      | 'statusFiscal'
      | 'documentoFiscalId'
      | 'tipoDocFiscal'
      | 'cliente'
      | 'retornoSefaz'
      | 'dataUltimaModificacao'
      | 'dataEmissaoFiscal'
      | 'dataFinalizacao'
      | 'dataCriacao'
      | 'numeroFiscal'
    >
  > = {}
): VendaUnificadaDTO {
  return {
    id: 'venda-test-1',
    statusFiscal: null,
    documentoFiscalId: null,
    tipoDocFiscal: null,
    cliente: null,
    retornoSefaz: null,
    dataUltimaModificacao: null,
    dataEmissaoFiscal: null,
    dataFinalizacao: null,
    dataCriacao: '2026-07-01T10:00:00.000Z',
    numeroFiscal: null,
    ...overrides,
  } as unknown as VendaUnificadaDTO
}

const SEM_ACAO_EM_ANDAMENTO: Record<string, 'emitindo' | 'reemitindo'> = {}

describe('vendaElegivelParaReemissaoAutomaticaLote', () => {
  it('retorna false para venda EMITIDA (bloqueada para emissão interativa)', () => {
    const venda = makeVenda({ statusFiscal: 'EMITIDA', documentoFiscalId: 'doc-123' })
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, SEM_ACAO_EM_ANDAMENTO)).toBe(false)
  })

  it('retorna false para venda com status diferente de REJEITADA/DENEGADA', () => {
    const venda = makeVenda({ statusFiscal: 'PENDENTE' })
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, SEM_ACAO_EM_ANDAMENTO)).toBe(false)
  })

  it('retorna false para venda sem statusFiscal fiscal (null)', () => {
    const venda = makeVenda({ statusFiscal: null })
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, SEM_ACAO_EM_ANDAMENTO)).toBe(false)
  })

  it('retorna true para venda REJEITADA com documentoFiscalId', () => {
    const venda = makeVenda({ statusFiscal: 'REJEITADA', documentoFiscalId: 'doc-456' })
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, SEM_ACAO_EM_ANDAMENTO)).toBe(true)
  })

  it('retorna true para venda DENEGADA com documentoFiscalId', () => {
    const venda = makeVenda({ statusFiscal: 'DENEGADA', documentoFiscalId: 'doc-789' })
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, SEM_ACAO_EM_ANDAMENTO)).toBe(true)
  })

  it('retorna true para venda DENEGADA sem documentoId mas com tipoDocFiscal NFCE', () => {
    const venda = makeVenda({ statusFiscal: 'DENEGADA', tipoDocFiscal: 'NFCE' })
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, SEM_ACAO_EM_ANDAMENTO)).toBe(true)
  })

  it('retorna false para venda REJEITADA com NFE sem cliente vinculado', () => {
    const venda = makeVenda({
      statusFiscal: 'REJEITADA',
      tipoDocFiscal: 'NFE',
      cliente: null,
    })
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, SEM_ACAO_EM_ANDAMENTO)).toBe(false)
  })

  it('retorna true para venda REJEITADA com NFE e cliente vinculado', () => {
    const venda = makeVenda({
      statusFiscal: 'REJEITADA',
      tipoDocFiscal: 'NFE',
      cliente: { id: 'cliente-1', nome: 'João Silva' },
    })
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, SEM_ACAO_EM_ANDAMENTO)).toBe(true)
  })

  it('retorna false quando emissão já está em andamento para a venda', () => {
    const venda = makeVenda({ statusFiscal: 'REJEITADA', documentoFiscalId: 'doc-111' })
    const acoes: Record<string, 'emitindo' | 'reemitindo'> = { 'venda-test-1': 'reemitindo' }
    expect(vendaElegivelParaReemissaoAutomaticaLote(venda, acoes)).toBe(false)
  })
})

describe('fiscalKanbanPodeReemitirAposCooldown', () => {
  // Timestamps relativos a Date.now() para evitar dependência de data fixa
  const MAIS_DE_10_MIN_ATRAS = new Date(Date.now() - 11 * 60 * 1000).toISOString()
  const MENOS_DE_10_MIN_ATRAS = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  it('retorna false para venda REJEITADA (não é PENDENTE — cooldown só se aplica a PENDENTE)', () => {
    const venda = makeVenda({ statusFiscal: 'REJEITADA', dataUltimaModificacao: MAIS_DE_10_MIN_ATRAS })
    expect(fiscalKanbanPodeReemitirAposCooldown(venda)).toBe(false)
  })

  it('retorna false para venda PENDENTE sem documento/número fiscal (não está travada)', () => {
    const venda = makeVenda({
      statusFiscal: 'PENDENTE',
      documentoFiscalId: null,
      numeroFiscal: null,
      dataUltimaModificacao: MAIS_DE_10_MIN_ATRAS,
    })
    expect(fiscalKanbanPodeReemitirAposCooldown(venda)).toBe(false)
  })

  it('retorna false para venda PENDENTE travada mas dentro do cooldown (5 min atrás)', () => {
    const venda = makeVenda({
      statusFiscal: 'PENDENTE',
      documentoFiscalId: 'doc-222',
      dataEmissaoFiscal: null,
      dataUltimaModificacao: MENOS_DE_10_MIN_ATRAS,
    })
    expect(fiscalKanbanPodeReemitirAposCooldown(venda)).toBe(false)
  })

  it('retorna true para venda PENDENTE travada fora do cooldown (11 min atrás)', () => {
    const venda = makeVenda({
      statusFiscal: 'PENDENTE',
      documentoFiscalId: 'doc-333',
      dataEmissaoFiscal: null,
      dataUltimaModificacao: MAIS_DE_10_MIN_ATRAS,
    })
    expect(fiscalKanbanPodeReemitirAposCooldown(venda)).toBe(true)
  })
})
