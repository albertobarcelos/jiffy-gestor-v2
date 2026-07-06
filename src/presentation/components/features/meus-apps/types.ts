import type { ConvitePendente } from '@/src/presentation/components/features/convites/types'

export type MeusAppStatus = 'ativo' | 'inativo'

export type MeusApp = {
  id: string
  nome: string
  status: MeusAppStatus
  /** Texto curto exibido no card (ex.: "BPO"). */
  tipo?: string
  /** Sigla/abreviação para fallback de avatar quando não houver logo. */
  sigla?: string
}

/** Item lógico do feed (convite ou empresa), antes do slot de propaganda no grid. */
export type MeusAppsFeedItem =
  | { kind: 'convite'; convite: ConvitePendente }
  | { kind: 'empresa'; app: MeusApp }

/** Célula renderizada no grid: feed ou card promocional (apenas 1× na primeira linha). */
export type MeusAppsGridCell = MeusAppsFeedItem | { kind: 'promo'; id: string }

/** Id estável do slot de propaganda no grid (chave React). */
export const MEUS_APPS_PROMO_SLOT_ID = 'meus-apps-promo-slot'

/** Itens do feed visíveis no grid antes de “Mostrar mais” (5 linhas × 3 colunas, sem contar o slot promo). */
export const MEUS_APPS_GRID_PREVIEW_LIMIT = 15

