import {
  type MeusAppsFeedItem,
  type MeusAppsGridCell,
  MEUS_APPS_GRID_PREVIEW_LIMIT,
  MEUS_APPS_PROMO_SLOT_ID,
} from '../types'

/**
 * Monta células do grid de empresas: insere propaganda entre o 1º e 2º item
 * (centro da primeira linha em 3 colunas). Só ocorre uma vez.
 * Com `expandido: false`, limita a {@link MEUS_APPS_GRID_PREVIEW_LIMIT} empresas.
 */
export function buildMeusAppsGridCells(
  empresaItems: Extract<MeusAppsFeedItem, { kind: 'empresa' }>[],
  options: { expandido: boolean }
): MeusAppsGridCell[] {
  const visiveis = options.expandido
    ? empresaItems
    : empresaItems.slice(0, MEUS_APPS_GRID_PREVIEW_LIMIT)

  if (visiveis.length < 2) {
    return visiveis
  }

  const promoSlot: MeusAppsGridCell = { kind: 'promo', id: MEUS_APPS_PROMO_SLOT_ID }
  return [visiveis[0], promoSlot, ...visiveis.slice(1)]
}
