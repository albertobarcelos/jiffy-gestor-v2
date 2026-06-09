import {
  type MeusAppsFeedItem,
  type MeusAppsGridCell,
  MEUS_APPS_GRID_PREVIEW_LIMIT,
  MEUS_APPS_PROMO_SLOT_ID,
} from '../types'

/**
 * Monta a lista de células do grid: insere o slot de propaganda entre o 1º e 2º item
 * (centro da primeira linha em 3 colunas). Só ocorre uma vez; demais linhas são só feed.
 * Com `expandido: false`, mostra até {@link MEUS_APPS_GRID_PREVIEW_LIMIT} itens do feed.
 */
export function buildMeusAppsGridCells(
  feedItems: MeusAppsFeedItem[],
  options: { expandido: boolean }
): MeusAppsGridCell[] {
  const visiveis = options.expandido
    ? feedItems
    : feedItems.slice(0, MEUS_APPS_GRID_PREVIEW_LIMIT)

  if (visiveis.length < 2) {
    return visiveis
  }

  const promoSlot: MeusAppsGridCell = { kind: 'promo', id: MEUS_APPS_PROMO_SLOT_ID }
  return [visiveis[0], promoSlot, ...visiveis.slice(1)]
}
