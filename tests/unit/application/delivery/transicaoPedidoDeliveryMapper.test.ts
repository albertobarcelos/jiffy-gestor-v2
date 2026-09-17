import { describe, expect, it } from 'vitest'
import { extrairPatchOperacionalKanbanDeStatusDelivery } from '@/src/application/mappers/TransicaoPedidoDeliveryMapper'

describe('extrairPatchOperacionalKanbanDeStatusDelivery', () => {
  it('payload fino sem statusDelivery não apaga etapa nem data de finalização', () => {
    const patch = extrairPatchOperacionalKanbanDeStatusDelivery({
      id: 'ped-1',
      resumoFiscal: { status: 'EMITIDA' },
    })

    expect(patch.statusEtapaOperacional).toBeUndefined()
    expect(patch.dataFinalizacao).toBeUndefined()
  })

  it('payload com FINALIZADO preserva a etapa operacional', () => {
    const patch = extrairPatchOperacionalKanbanDeStatusDelivery({
      id: 'ped-1',
      statusDelivery: 'FINALIZADO',
      dataFinalizacao: '2026-07-01T11:00:00.000Z',
    })

    expect(patch.statusEtapaOperacional).toBe('FINALIZADO')
    expect(patch.dataFinalizacao).toBe('2026-07-01T11:00:00.000Z')
  })
})
