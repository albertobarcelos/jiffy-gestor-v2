import type { ConvitePendente } from '@/src/presentation/components/features/convites/types'

export type MinhasEmpresaStatus = 'ativo' | 'inativo'

export type MinhasEmpresa = {
  id: string
  nome: string
  status: MinhasEmpresaStatus
  /** Texto curto exibido no card (ex.: "BPO"). */
  tipo?: string
  /** Sigla/abreviação para fallback de avatar quando não houver logo. */
  sigla?: string
}

/** Item lógico do feed (convite ou empresa), antes do slot de propaganda no grid. */
export type MinhasEmpresasFeedItem =
  | { kind: 'convite'; convite: ConvitePendente }
  | { kind: 'empresa'; app: MinhasEmpresa }

/** Célula renderizada no grid: feed ou card promocional (apenas 1× na primeira linha). */
export type MinhasEmpresasGridCell = MinhasEmpresasFeedItem | { kind: 'promo'; id: string }

/** Id estável do slot de propaganda no grid (chave React). */
export const MINHAS_EMPRESAS_PROMO_SLOT_ID = 'minhas-empresas-promo-slot'

/** Itens do feed visíveis no grid antes de “Mostrar mais” (5 linhas × 3 colunas, sem contar o slot promo). */
export const MINHAS_EMPRESAS_GRID_PREVIEW_LIMIT = 15
