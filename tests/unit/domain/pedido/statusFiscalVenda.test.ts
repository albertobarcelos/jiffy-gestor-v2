import { describe, expect, it } from 'vitest'
import {
  statusFiscalEhEmitida,
  statusFiscalPermiteAbaNotaFiscal,
  statusFiscalPermiteCancelarNota,
} from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import { StatusFiscalVenda } from '@/src/domain/value-objects/StatusFiscalVenda'
import { NFe } from '@/src/domain/entities/NFe'

describe('StatusFiscalVenda', () => {
  it('normaliza autorização da SEFAZ para EMITIDA', () => {
    expect(StatusFiscalVenda.tryParse('autorizada')?.isEmitida()).toBe(true)
    expect(StatusFiscalVenda.tryParse('EM_PROCESSAMENTO')?.valor).toBe('PENDENTE_AUTORIZACAO')
    expect(StatusFiscalVenda.tryParse('COZINHA')).toBeNull()
  })

  it('classifica buckets do Kanban Entregues', () => {
    expect(StatusFiscalVenda.tryParse('EMITIDA')?.bucketEntregues()).toBe('EMITIDA')
    expect(StatusFiscalVenda.tryParse('INUTILIZADA')?.bucketEntregues()).toBe('CANCELADA')
    expect(StatusFiscalVenda.tryParse('DENEGADA')?.bucketEntregues()).toBe('REJEITADA')
    expect(StatusFiscalVenda.tryParse('CONTINGENCIA')?.bucketEntregues()).toBe('PENDENTE')
  })

  it('projeta coluna fiscal do balcão', () => {
    expect(StatusFiscalVenda.tryParse('REJEITADA')?.colunaKanbanFiscal()).toBe('REJEITADAS')
    expect(StatusFiscalVenda.tryParse('PENDENTE_EMISSAO')?.colunaKanbanFiscal()).toBe(
      'PENDENTE_EMISSAO'
    )
    expect(StatusFiscalVenda.tryParse('EMITIDA')?.colunaKanbanFiscal()).toBe('COM_FISCAL')
    expect(StatusFiscalVenda.tryParse('UNKNOWN')?.colunaKanbanFiscal()).toBeNull()
  })

  it('NFe.fromJSON guarda o valor canônico, não o alias', () => {
    expect(
      NFe.fromJSON({
        id: '1',
        numero: '1',
        clienteId: 'c1',
        clienteNome: 'A',
        status: 'AUTORIZADA',
        valorTotal: 10,
        itens: [],
      }).getStatus()
    ).toBe('EMITIDA')
    expect(
      NFe.fromJSON({
        id: '2',
        numero: '2',
        clienteId: 'c2',
        clienteNome: 'B',
        status: 'EM_PROCESSAMENTO',
        valorTotal: 10,
        itens: [],
      }).getStatus()
    ).toBe('PENDENTE_AUTORIZACAO')
  })
})

describe('RegrasFiscaisVenda via VO', () => {
  it('reconhece emitida e alias AUTORIZADA', () => {
    expect(statusFiscalEhEmitida('AUTORIZADA', null)).toBe(true)
    expect(statusFiscalPermiteCancelarNota('EMITIDA', null, null)).toBe(true)
    expect(statusFiscalPermiteAbaNotaFiscal('PENDENTE_AUTORIZACAO')).toBe(true)
    expect(statusFiscalPermiteAbaNotaFiscal('INUTILIZADA')).toBe(false)
  })
})
