import {
  type MinhasEmpresasFeedItem,
  type MinhasEmpresasGridCell,
  MINHAS_EMPRESAS_GRID_PREVIEW_LIMIT,
  MINHAS_EMPRESAS_PROMO_SLOT_ID,
} from '../types'

/**
 * Monta células do grid de empresas: insere propaganda entre o 1º e 2º item
 * (centro da primeira linha em 3 colunas). Só ocorre uma vez.
 * Com `expandido: false`, limita a {@link MINHAS_EMPRESAS_GRID_PREVIEW_LIMIT} empresas.
 */
export function buildMinhasEmpresasGridCells(
  empresaItems: Extract<MinhasEmpresasFeedItem, { kind: 'empresa' }>[],
  options: { expandido: boolean }
): MinhasEmpresasGridCell[] {
  const visiveis = options.expandido
    ? empresaItems
    : empresaItems.slice(0, MINHAS_EMPRESAS_GRID_PREVIEW_LIMIT)

  if (visiveis.length < 2) {
    return visiveis
  }

  const promoSlot: MinhasEmpresasGridCell = { kind: 'promo', id: MINHAS_EMPRESAS_PROMO_SLOT_ID }
  return [visiveis[0], promoSlot, ...visiveis.slice(1)]
}
