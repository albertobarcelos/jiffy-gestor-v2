import { describe, expect, it } from 'vitest'
import { kanbanToolbarTemFiltroAtivo } from '@/src/presentation/components/features/kanban/utils/kanbanToolbarTemFiltroAtivo'

const limpo = {
  isModoDelivery: false,
  searchInput: '',
  origemFilter: '',
  tipoCanalFilter: '',
  tipoEntregaFilter: '',
  terminalFilter: '',
  colunaKanbanFiltro: 'TODAS',
  periodoPreset: 'hoje' as const,
}

describe('kanbanToolbarTemFiltroAtivo', () => {
  it('é falso no estado após Limpar', () => {
    expect(kanbanToolbarTemFiltroAtivo(limpo)).toBe(false)
  })

  it('é verdadeiro quando busca, select ou período mudam', () => {
    expect(kanbanToolbarTemFiltroAtivo({ ...limpo, searchInput: '  12  ' })).toBe(true)
    expect(kanbanToolbarTemFiltroAtivo({ ...limpo, origemFilter: 'PDV' })).toBe(true)
    expect(kanbanToolbarTemFiltroAtivo({ ...limpo, tipoCanalFilter: 'GESTOR' })).toBe(true)
    expect(kanbanToolbarTemFiltroAtivo({ ...limpo, terminalFilter: 't1' })).toBe(true)
    expect(kanbanToolbarTemFiltroAtivo({ ...limpo, colunaKanbanFiltro: '' })).toBe(true)
    expect(kanbanToolbarTemFiltroAtivo({ ...limpo, colunaKanbanFiltro: 'REJEITADAS' })).toBe(true)
    expect(kanbanToolbarTemFiltroAtivo({ ...limpo, periodoPreset: 'ontem' })).toBe(true)
  })

  it('no delivery ignora canal, terminal e coluna do balcão', () => {
    expect(
      kanbanToolbarTemFiltroAtivo({
        ...limpo,
        isModoDelivery: true,
        tipoCanalFilter: 'PDV',
        terminalFilter: 't1',
        colunaKanbanFiltro: 'REJEITADAS',
      })
    ).toBe(false)
    expect(
      kanbanToolbarTemFiltroAtivo({
        ...limpo,
        isModoDelivery: true,
        tipoEntregaFilter: 'retirada',
      })
    ).toBe(true)
  })
})
