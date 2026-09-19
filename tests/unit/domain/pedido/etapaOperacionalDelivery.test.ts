import { describe, expect, it } from 'vitest'
import { etapaAposAcaoTransicao } from '@/src/domain/types/acaoTransicaoOperacionalDelivery'
import {
  colunaKanbanDeStatusEtapa,
  EtapaOperacionalDelivery,
  etapaOperacionalDaColunaKanban,
  statusDeliveryQueryDaColunaKanban,
} from '@/src/domain/value-objects/EtapaOperacionalDelivery'

describe('EtapaOperacionalDelivery', () => {
  it('aceita valores canônicos da API', () => {
    expect(EtapaOperacionalDelivery.tryParse('pendente')?.valor).toBe('PENDENTE')
    expect(EtapaOperacionalDelivery.tryParse('EM_PREPARO')?.valor).toBe('EM_PREPARO')
    expect(EtapaOperacionalDelivery.tryParse('PRONTO')?.valor).toBe('PRONTO')
    expect(EtapaOperacionalDelivery.tryParse('EM_ROTA')?.valor).toBe('EM_ROTA')
    expect(EtapaOperacionalDelivery.tryParse('FINALIZADO')?.isFinalizado()).toBe(true)
    expect(EtapaOperacionalDelivery.tryParse('CANCELADO')?.isCancelado()).toBe(true)
  })

  it('normaliza alias fechados e rejeita palpites', () => {
    expect(EtapaOperacionalDelivery.tryParse('NOVOS_PEDIDOS')?.valor).toBe('PENDENTE')
    expect(EtapaOperacionalDelivery.tryParse('PRONTO_ENTREGA')?.valor).toBe('PRONTO')
    expect(EtapaOperacionalDelivery.tryParse('entregue')?.valor).toBe('FINALIZADO')
    expect(EtapaOperacionalDelivery.tryParse('DESPACHADO')?.valor).toBe('EM_ROTA')
    expect(EtapaOperacionalDelivery.tryParse('COZINHA')).toBeNull()
    expect(EtapaOperacionalDelivery.tryParse('NOVO')).toBeNull()
    expect(EtapaOperacionalDelivery.tryParse('')).toBeNull()
  })

  it('projeta coluna do Kanban sem misturar fiscal', () => {
    expect(colunaKanbanDeStatusEtapa('PENDENTE')).toBe('NOVOS_PEDIDOS')
    expect(colunaKanbanDeStatusEtapa('PRONTO')).toBe('PRONTO_ENTREGA')
    expect(colunaKanbanDeStatusEtapa('ENTREGUE')).toBe('FINALIZADAS')
    expect(etapaOperacionalDaColunaKanban('NOVOS_PEDIDOS')).toBe('PENDENTE')
    expect(etapaOperacionalDaColunaKanban('PRONTO_ENTREGA')).toBe('PRONTO')
    expect(etapaOperacionalDaColunaKanban('FINALIZADAS')).toBeNull()
    expect(statusDeliveryQueryDaColunaKanban('FINALIZADAS')).toEqual(['FINALIZADO', 'CANCELADO'])
    expect(statusDeliveryQueryDaColunaKanban('EM_PREPARO')).toBe('EM_PREPARO')
    expect(colunaKanbanDeStatusEtapa(null)).toBeNull()
    expect(colunaKanbanDeStatusEtapa('ABERTA')).toBeNull()
  })

  it('mapeia ação de transição para etapa', () => {
    expect(etapaAposAcaoTransicao('iniciar_preparo')).toBe('EM_PREPARO')
    expect(etapaAposAcaoTransicao('marcar_pronto')).toBe('PRONTO')
    expect(etapaAposAcaoTransicao('despachar')).toBe('EM_ROTA')
    expect(etapaAposAcaoTransicao('finalizar')).toBe('FINALIZADO')
    expect(etapaAposAcaoTransicao('cancelar')).toBe('CANCELADO')
  })
})
