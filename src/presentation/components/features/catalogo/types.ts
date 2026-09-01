export type CatalogListVariant = 'base' | 'menu'

export interface CatalogGrupoVisual {
  corHex: string
  iconName: string
}

export interface CatalogGroup<T> {
  groupKey: string
  grupoLabel: string
  grupoId?: string
  grupoVisual?: CatalogGrupoVisual
  grupoAtivo: boolean
  /** Ordem da categoria no snapshot do menu. Ausente = vai para o fim. */
  ordem?: number
  items: T[]
}
