export type DesignMigrationMarker = 'imported' | 'dismissed'

export interface IDesignConfigStorage {
  readRaw(empresaId: string): string | null
  has(empresaId: string): boolean
  getMarker(empresaId: string): DesignMigrationMarker | null
  mark(empresaId: string, marker: DesignMigrationMarker): void
  clear(empresaId: string, slug?: string): void
}
