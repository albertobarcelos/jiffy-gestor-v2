import type {
  DesignMigrationMarker,
  IDesignConfigStorage,
} from '@/src/application/ports/IDesignConfigStorage'

const STORAGE_PREFIX = 'jiffy:delivery-design'

function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function keyEmpresa(empresaId: string): string {
  return `${STORAGE_PREFIX}:empresa:${empresaId}`
}

function keySlug(slug: string): string {
  return `${STORAGE_PREFIX}:slug:${slug.trim().toLowerCase()}`
}

function keyMigrated(empresaId: string): string {
  return `${STORAGE_PREFIX}:migrated:${empresaId}`
}

export class DesignConfigLocalStorageAdapter implements IDesignConfigStorage {
  readRaw(empresaId: string): string | null {
    return browserStorage()?.getItem(keyEmpresa(empresaId)) ?? null
  }

  has(empresaId: string): boolean {
    return this.readRaw(empresaId) != null
  }

  getMarker(empresaId: string): DesignMigrationMarker | null {
    const raw = browserStorage()?.getItem(keyMigrated(empresaId))
    if (raw === 'imported' || raw === 'dismissed') return raw
    if (raw === '1') return 'imported'
    return null
  }

  mark(empresaId: string, marker: DesignMigrationMarker): void {
    browserStorage()?.setItem(keyMigrated(empresaId), marker)
  }

  clear(empresaId: string, slug?: string): void {
    const storage = browserStorage()
    if (!storage) return
    storage.removeItem(keyEmpresa(empresaId))
    if (slug?.trim()) storage.removeItem(keySlug(slug.trim()))
  }
}

export const designConfigLocalStorage = new DesignConfigLocalStorageAdapter()
