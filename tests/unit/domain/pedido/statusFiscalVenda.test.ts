import { describe, expect, it } from 'vitest'
import {
  statusFiscalEhEmitida,
  statusFiscalPermiteAbaNotaFiscal,
  statusFiscalPermiteCancelarNota,
} from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import { StatusFiscalVenda } from '@/src/domain/value-objects/StatusFiscalVenda'
import { NFe } from '@/src/domain/entities/NFe'

describe('StatusFiscalVenda', () => {
  it('aceita só o enum do Swagger', () => {
    expect(StatusFiscalVenda.tryParse('EMITIDA')?.isEmitida()).toBe(true)
    expect(StatusFiscalVenda.tryParse('AUTORIZADA')).toBeNull()
    expect(StatusFiscalVenda.tryParse('EM_PROCESSAMENTO')).toBeNull()
    expect(StatusFiscalVenda.tryParse('PENDENTE_AUTORIZACAO')).toBeNull()
    expect(StatusFiscalVenda.tryParse('CONTINGENCIA')).toBeNull()
    expect(StatusFiscalVenda.tryParse('PENDENTE_EMISSAO')).toBeNull()
    expect(StatusFiscalVenda.tryParse('COZINHA')).toBeNull()
  })

  it('classifica buckets do Kanban Entregues', () => {
    expect(StatusFiscalVenda.tryParse('EMITIDA')?.bucketEntregues()).toBe('EMITIDA')
    expect(StatusFiscalVenda.tryParse('INUTILIZADA')?.bucketEntregues()).toBe('CANCELADA')
    expect(StatusFiscalVenda.tryParse('DENEGADA')?.bucketEntregues()).toBe('REJEITADA')
    expect(StatusFiscalVenda.tryParse('PENDENTE')?.bucketEntregues()).toBe('PENDENTE')
    expect(StatusFiscalVenda.tryParse('UNKNOWN')?.bucketEntregues()).toBe('PENDENTE')
  })

  it('projeta coluna fiscal do balcão como o backend', () => {
    expect(StatusFiscalVenda.tryParse('REJEITADA')?.colunaKanbanFiscal()).toBe('REJEITADAS')
    expect(StatusFiscalVenda.tryParse('EMITIDA')?.colunaKanbanFiscal()).toBe('COM_FISCAL')
    expect(StatusFiscalVenda.tryParse('UNKNOWN')?.colunaKanbanFiscal()).toBe('COM_FISCAL')
    expect(StatusFiscalVenda.tryParse('UNKNOWN')?.isUnknown()).toBe(true)
  })

  it('NFe.fromJSON só guarda status do enum', () => {
    expect(
      NFe.fromJSON({
        id: '1',
        numero: '1',
        clienteId: 'c1',
        clienteNome: 'A',
        status: 'EMITIDA',
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
        status: 'AUTORIZADA',
        valorTotal: 10,
        itens: [],
      }).getStatus()
    ).toBe('PENDENTE')
  })
})

describe('RegrasFiscaisVenda via VO', () => {
  it('reconhece emitida canônica', () => {
    expect(statusFiscalEhEmitida('EMITIDA', null)).toBe(true)
    expect(statusFiscalEhEmitida('AUTORIZADA', null)).toBe(false)
    expect(statusFiscalPermiteCancelarNota('EMITIDA', null, null)).toBe(true)
    expect(statusFiscalPermiteAbaNotaFiscal('PENDENTE')).toBe(true)
    expect(statusFiscalPermiteAbaNotaFiscal('INUTILIZADA')).toBe(false)
  })
})
