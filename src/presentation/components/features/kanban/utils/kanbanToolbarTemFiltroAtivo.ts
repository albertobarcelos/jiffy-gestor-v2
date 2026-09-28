import type { KanbanFiltroDataPreset } from './kanbanFiltroDataPresets'

type KanbanToolbarFiltroAtivoInput = {
  isModoDelivery: boolean
  searchInput: string
  origemFilter: string
  tipoCanalFilter: string
  tipoEntregaFilter: string
  terminalFilter: string
  colunaKanbanFiltro: string
  periodoPreset: KanbanFiltroDataPreset
}

/** Alinhado ao reset de `handleClearFilters`: hoje + selects vazios + filtro de coluna Todas. */
export function kanbanToolbarTemFiltroAtivo(input: KanbanToolbarFiltroAtivoInput): boolean {
  const buscaOuPeriodo =
    input.searchInput.trim() !== '' || input.periodoPreset !== 'hoje'
  if (input.isModoDelivery) {
    return buscaOuPeriodo || input.origemFilter !== '' || input.tipoEntregaFilter !== ''
  }
  return (
    buscaOuPeriodo ||
    input.origemFilter !== '' ||
    input.tipoCanalFilter !== '' ||
    input.terminalFilter.trim() !== '' ||
    input.colunaKanbanFiltro !== 'TODAS'
  )
}
