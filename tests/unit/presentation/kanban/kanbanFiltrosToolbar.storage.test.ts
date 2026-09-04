/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import {
  KANBAN_FILTROS_TOOLBAR_STORAGE_KEY,
  gravarFiltrosToolbarKanbanNoStorage,
  lerFiltrosToolbarKanbanDoStorage,
  mesclarPendenciaFiltrosToolbarKanban,
  sanitizarSnapshotFiltrosToolbarKanban,
  snapshotFiltrosToolbarKanbanPadrao,
} from '@/src/presentation/components/features/kanban/rules/vendasKanban.storage'

describe('sanitizarSnapshotFiltrosToolbarKanban', () => {
  it('ignora lixo e devolve o padrão', () => {
    expect(sanitizarSnapshotFiltrosToolbarKanban(null)).toEqual(snapshotFiltrosToolbarKanbanPadrao())
    expect(sanitizarSnapshotFiltrosToolbarKanban('x')).toEqual(snapshotFiltrosToolbarKanbanPadrao())
  })

  it('mantém busca, tipo de entrega e período ao mudar a vista', () => {
    const snap = sanitizarSnapshotFiltrosToolbarKanban({
      searchInput: 'Ana',
      origemFilter: 'GESTOR',
      tipoEntregaFilter: 'retirada',
      periodoPreset: 'todos',
      periodoDataModo: 'todos',
      periodoInicioISO: '2026-08-01T00:00:00.000Z',
      periodoFimISO: '2026-08-31T23:59:00.000Z',
    })
    expect(snap.searchInput).toBe('Ana')
    expect(snap.tipoEntregaFilter).toBe('retirada')
    expect(snap.periodoPreset).toBe('todos')
    expect(snap.periodoInicioISO).toBeNull()
  })

  it('guarda datas só em últimos 7 dias e por data', () => {
    const porData = sanitizarSnapshotFiltrosToolbarKanban({
      searchInput: '',
      tipoEntregaFilter: '',
      periodoPreset: 'por_data',
      periodoDataModo: 'periodo',
      periodoInicioISO: '2026-08-10T00:00:00.000Z',
      periodoFimISO: '2026-08-12T23:59:00.000Z',
    })
    expect(porData.periodoInicioISO).toBe('2026-08-10T00:00:00.000Z')
    expect(porData.periodoFimISO).toBe('2026-08-12T23:59:00.000Z')
  })
})

describe('mesclarPendenciaFiltrosToolbarKanban', () => {
  it('não apaga tipo de entrega ao aplicar pedidos do cliente', () => {
    const base = {
      ...snapshotFiltrosToolbarKanbanPadrao(),
      tipoEntregaFilter: 'entrega' as const,
      periodoPreset: 'ontem' as const,
    }
    const next = mesclarPendenciaFiltrosToolbarKanban(base, {
      busca: '6599',
      periodoTodos: true,
    })
    expect(next.searchInput).toBe('6599')
    expect(next.periodoPreset).toBe('todos')
    expect(next.tipoEntregaFilter).toBe('entrega')
  })
})

describe('sessionStorage dos filtros da barra', () => {
  it('sobrevive a um remount (troca de visualização / WhatsApp)', () => {
    sessionStorage.removeItem(KANBAN_FILTROS_TOOLBAR_STORAGE_KEY)
    gravarFiltrosToolbarKanbanNoStorage({
      ...snapshotFiltrosToolbarKanbanPadrao(),
      searchInput: 'PED-12',
      tipoEntregaFilter: 'entrega',
      periodoPreset: 'ultimos_7',
      periodoDataModo: 'periodo',
      periodoInicioISO: '2026-08-24T00:00:00.000Z',
      periodoFimISO: '2026-08-31T23:59:00.000Z',
    })
    const lido = lerFiltrosToolbarKanbanDoStorage()
    expect(lido.searchInput).toBe('PED-12')
    expect(lido.tipoEntregaFilter).toBe('entrega')
    expect(lido.periodoPreset).toBe('ultimos_7')
  })
})
