import { describe, expect, it } from 'vitest'
import {
  colunaKanbanDeStatusEtapa,
  rotuloEtapaDetalhePedido,
  rotuloTipoAtendimento,
} from '@/src/presentation/components/features/pedidos/utils/detalheVisaoUnica'

describe('colunaKanbanDeStatusEtapa', () => {
  it('mapeia etapas operacionais', () => {
    expect(colunaKanbanDeStatusEtapa('PENDENTE')).toBe('NOVOS_PEDIDOS')
    expect(colunaKanbanDeStatusEtapa('EM_PREPARO')).toBe('EM_PREPARO')
    expect(colunaKanbanDeStatusEtapa('PRONTO')).toBe('PRONTO_ENTREGA')
    expect(colunaKanbanDeStatusEtapa('EM_ROTA')).toBe('EM_ROTA')
    expect(colunaKanbanDeStatusEtapa('ENTREGUE')).toBe('FINALIZADAS')
  })
})

describe('rotuloEtapaDetalhePedido', () => {
  it('humaniza entrega e retirada em rota', () => {
    expect(rotuloEtapaDetalhePedido('EM_ROTA', 'entrega')).toBe('Despachado')
    expect(rotuloEtapaDetalhePedido('EM_ROTA', 'retirada')).toBe('Aguardando retirada')
  })
})

describe('rotuloTipoAtendimento', () => {
  it('nomeia entrega, retirada e balcão', () => {
    expect(rotuloTipoAtendimento('entrega')).toBe('Entrega')
    expect(rotuloTipoAtendimento('retirada')).toBe('Retirada')
    expect(rotuloTipoAtendimento('balcao')).toBe('Balcão')
  })
})
