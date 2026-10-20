import { describe, expect, it } from 'vitest'
import {
  extrairPatchKanbanDeRespostaTransicao,
  extrairPatchKanbanDeTransicaoDelivery,
  extrairPatchOperacionalKanbanDeStatusDelivery,
} from '@/src/application/mappers/TransicaoPedidoDeliveryMapper'

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

  it('summary sem datas de preparo não manda null no patch (não apaga o cache)', () => {
    const patch = extrairPatchKanbanDeTransicaoDelivery({
      id: 'ped-1',
      tipoEntrega: 'entrega',
      valorFinal: 80,
      cliente: { nome: 'Maria' },
      statusDelivery: 'EM_PREPARO',
    })
    expect(patch.dataInicioPreparo).toBeUndefined()
    expect(patch.dataFinalizacaoPreparo).toBeUndefined()
  })

  it('GET unificado de fundo copia início/fim de preparo quando a API manda ISO', () => {
    const patch = extrairPatchKanbanDeRespostaTransicao({
      id: 'ped-1',
      tipoEntrega: 'entrega',
      valorFinal: 80,
      cliente: { nome: 'Maria' },
      statusDelivery: 'PRONTO',
      dataInicioPreparo: '2026-06-15T10:00:00.000Z',
      dataFinalizacaoPreparo: '2026-06-15T10:12:00.000Z',
    })
    expect(patch.dataInicioPreparo).toBe('2026-06-15T10:00:00.000Z')
    expect(patch.dataFinalizacaoPreparo).toBe('2026-06-15T10:12:00.000Z')
  })
})
