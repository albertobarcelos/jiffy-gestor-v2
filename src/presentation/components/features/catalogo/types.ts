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
  items: T[]
}
